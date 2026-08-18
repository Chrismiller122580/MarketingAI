import { Prisma } from "@prisma/client";
import { chatCompletion, hasAnyAiKey } from "@/lib/ai-client";
import { resolveDisplayMediaUrl } from "@/lib/display-media-url";
import { prisma } from "@/lib/db";
import {
  defaultCreatorAvatarValues,
  parseCreatorAvatar,
  type CreatorAvatarForm,
} from "@/lib/schemas/creator-avatar-schema";
import {
  factsFromRecord,
  type ProductFactsForm,
} from "@/lib/schemas/product-facts-schema";
import type { ContentType, GeneratedPost, Platform } from "@/lib/types";
import {
  resolveInfluencerAssets,
  type InfluencerAssets,
} from "./influencer-assets";
import {
  listInfluencerRenders,
  type InfluencerRenderRecord,
} from "./influencer-renders";
import {
  mergeInfluencerMemory,
  type InfluencerMemory,
} from "./learning";

export const WORLD_EVENT_TYPES = [
  "life_event",
  "world_learn",
  "world_collab",
  "world_merge",
  "world_post",
] as const;

export type WorldEventType = (typeof WORLD_EVENT_TYPES)[number];

export type LifeEventKind =
  | "arrived"
  | "milestone"
  | "mood"
  | "travel"
  | "collab"
  | "lesson"
  | "everyday"
  | "create";

export type AvatarRelationshipKind =
  | "friend"
  | "collaborator"
  | "mentor"
  | "rival";

export type AvatarRelationship = {
  influencerId: string;
  handle: string;
  displayName: string;
  kind: AvatarRelationshipKind;
  note?: string;
};

export type AvatarWorldProfile = {
  bio: string;
  backstory: string;
  occupation: string;
  hometown: string;
  currentCity: string;
  relationshipStatus: string;
  values: string[];
  goals: string[];
  interests: string[];
  mood: string;
  moodNote: string;
  catchphrase: string;
  isPublic: boolean;
  relationships: AvatarRelationship[];
  learnedNotes: string[];
};

export type WorldLifeEvent = {
  id: string;
  influencerId: string;
  displayName: string;
  handle: string;
  portraitUrl?: string;
  eventType: WorldEventType;
  kind: LifeEventKind;
  title: string;
  body: string;
  mood?: string;
  relatedInfluencerId?: string;
  relatedHandle?: string;
  createdAt: string;
};

export type WorldPostCard = {
  id: string;
  influencerId: string;
  displayName: string;
  handle: string;
  portraitUrl?: string;
  text: string;
  platform: string;
  insights: string[];
  videoUrl?: string;
  imageUrl?: string;
  createdAt: string;
};

export const defaultWorldProfile: AvatarWorldProfile = {
  bio: "",
  backstory: "",
  occupation: "",
  hometown: "",
  currentCity: "",
  relationshipStatus: "",
  values: [],
  goals: [],
  interests: [],
  mood: "inspired",
  moodNote: "",
  catchphrase: "",
  isPublic: true,
  relationships: [],
  learnedNotes: [],
};

export function parseWorldProfile(input: unknown): AvatarWorldProfile {
  const raw =
    input && typeof input === "object"
      ? (input as Partial<AvatarWorldProfile>)
      : {};
  return {
    bio: typeof raw.bio === "string" ? raw.bio : "",
    backstory: typeof raw.backstory === "string" ? raw.backstory : "",
    occupation: typeof raw.occupation === "string" ? raw.occupation : "",
    hometown: typeof raw.hometown === "string" ? raw.hometown : "",
    currentCity: typeof raw.currentCity === "string" ? raw.currentCity : "",
    relationshipStatus:
      typeof raw.relationshipStatus === "string" ? raw.relationshipStatus : "",
    values: Array.isArray(raw.values)
      ? raw.values.filter((v): v is string => typeof v === "string").slice(0, 8)
      : [],
    goals: Array.isArray(raw.goals)
      ? raw.goals.filter((v): v is string => typeof v === "string").slice(0, 8)
      : [],
    interests: Array.isArray(raw.interests)
      ? raw.interests.filter((v): v is string => typeof v === "string").slice(0, 10)
      : [],
    mood: typeof raw.mood === "string" && raw.mood.trim() ? raw.mood : "inspired",
    moodNote: typeof raw.moodNote === "string" ? raw.moodNote : "",
    catchphrase: typeof raw.catchphrase === "string" ? raw.catchphrase : "",
    isPublic: raw.isPublic !== false,
    relationships: Array.isArray(raw.relationships)
      ? raw.relationships
          .filter(
            (rel): rel is AvatarRelationship =>
              !!rel &&
              typeof rel === "object" &&
              typeof rel.influencerId === "string" &&
              typeof rel.handle === "string" &&
              typeof rel.displayName === "string",
          )
          .slice(0, 12)
      : [],
    learnedNotes: Array.isArray(raw.learnedNotes)
      ? raw.learnedNotes
          .filter((v): v is string => typeof v === "string")
          .slice(0, 16)
      : [],
  };
}

export function hydrateWorldProfile(
  persona: CreatorAvatarForm,
  memory: InfluencerMemory | null | undefined,
): AvatarWorldProfile {
  const existing = parseWorldProfile(memory?.world);
  const location = persona.location.split("+")[0]?.trim() || persona.location;
  const voiceLead = persona.personalityVoice.split(".")[0]?.trim() ?? "";

  return {
    ...existing,
    bio: existing.bio || voiceLead.slice(0, 180),
    backstory:
      existing.backstory ||
      `${persona.displayName} grew up around ${location}. ${persona.culturalNotes} ${persona.personalityVoice}`
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 900),
    occupation: existing.occupation,
    hometown: existing.hometown || location,
    currentCity: existing.currentCity || location,
    relationshipStatus: existing.relationshipStatus,
    values: existing.values,
    goals: existing.goals,
    interests: existing.interests,
    mood: existing.mood || "inspired",
    moodNote: existing.moodNote,
    catchphrase: existing.catchphrase || persona.sampleQuote,
    isPublic: existing.isPublic,
    relationships: existing.relationships,
    learnedNotes: existing.learnedNotes,
  };
}

export function worldFromMemory(memory: unknown): AvatarWorldProfile {
  const mem = (memory ?? {}) as InfluencerMemory;
  return parseWorldProfile(mem.world);
}

export async function recordWorldEvent(input: {
  userId: string;
  influencerId: string;
  eventType: WorldEventType;
  payload: Record<string, unknown>;
}): Promise<{ id: string; createdAt: Date }> {
  const row = await prisma.creatorLearningEvent.create({
    data: {
      userId: input.userId,
      influencerId: input.influencerId,
      eventType: input.eventType,
      payload: input.payload as Prisma.InputJsonValue,
    },
  });
  return { id: row.id, createdAt: row.createdAt };
}

export async function ensureArrivalEvent(
  userId: string,
  influencerId: string,
  persona: CreatorAvatarForm,
): Promise<void> {
  const existing = await prisma.creatorLearningEvent.findFirst({
    where: {
      userId,
      influencerId,
      eventType: "life_event",
    },
    select: { id: true },
  });
  if (existing) return;

  await recordWorldEvent({
    userId,
    influencerId,
    eventType: "life_event",
    payload: {
      kind: "arrived",
      title: `Arrived in Avatar World`,
      body: `${persona.displayName} stepped into the world from ${persona.location}. ${persona.sampleQuote}`,
      mood: "inspired",
    },
  });
}

type EventRow = {
  id: string;
  influencerId: string | null;
  eventType: string;
  payload: unknown;
  createdAt: Date;
  influencer: {
    displayName: string;
    handle: string;
    assets: unknown;
  } | null;
};

export function toWorldLifeEvent(row: EventRow): WorldLifeEvent | null {
  if (!row.influencerId || !row.influencer) return null;
  if (!WORLD_EVENT_TYPES.includes(row.eventType as WorldEventType)) return null;

  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  const assets = resolveInfluencerAssets(
    (row.influencer.assets ?? {}) as InfluencerAssets,
  );
  const kind = (
    typeof payload.kind === "string" ? payload.kind : "everyday"
  ) as LifeEventKind;

  return {
    id: row.id,
    influencerId: row.influencerId,
    displayName: row.influencer.displayName,
    handle: row.influencer.handle,
    portraitUrl: assets.portraitUrl,
    eventType: row.eventType as WorldEventType,
    kind,
    title:
      typeof payload.title === "string"
        ? payload.title
        : defaultEventTitle(row.eventType as WorldEventType),
    body: typeof payload.body === "string" ? payload.body : "",
    mood: typeof payload.mood === "string" ? payload.mood : undefined,
    relatedInfluencerId:
      typeof payload.relatedInfluencerId === "string"
        ? payload.relatedInfluencerId
        : undefined,
    relatedHandle:
      typeof payload.relatedHandle === "string"
        ? payload.relatedHandle
        : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function defaultEventTitle(type: WorldEventType): string {
  switch (type) {
    case "world_learn":
      return "Learned something new";
    case "world_collab":
      return "Collaborated on a post";
    case "world_merge":
      return "Cut a longer reel";
    case "world_post":
      return "Published a post";
    default:
      return "A day in the world";
  }
}

export type WorldInfluencerCard = {
  id: string;
  displayName: string;
  handle: string;
  location: string;
  portraitUrl?: string;
  videoUrl?: string;
  mood: string;
  moodNote: string;
  bio: string;
  occupation: string;
  isPublic: boolean;
  videoCount: number;
  eventCount: number;
  postCount: number;
  updatedAt: string;
};

export async function listWorldInfluencers(
  userId: string,
): Promise<WorldInfluencerCard[]> {
  const rows = await prisma.influencer.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { renders: true, posts: true, learningEvents: true },
      },
    },
    take: 50,
  });

  return rows.map((row) => {
    const persona = parseCreatorAvatar(row.persona);
    const world = hydrateWorldProfile(
      persona.success ? persona.data : defaultCreatorAvatarValues,
      (row.memory ?? {}) as InfluencerMemory,
    );
    const assets = resolveInfluencerAssets((row.assets ?? {}) as InfluencerAssets);
    return {
      id: row.id,
      displayName: row.displayName,
      handle: row.handle,
      location: persona.success ? persona.data.location : world.currentCity,
      portraitUrl: assets.portraitUrl,
      videoUrl: assets.videoUrl,
      mood: world.mood,
      moodNote: world.moodNote,
      bio: world.bio,
      occupation: world.occupation,
      isPublic: world.isPublic,
      videoCount: row._count.renders,
      eventCount: row._count.learningEvents,
      postCount: row._count.posts,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function listWorldFeed(
  userId: string,
  limit = 40,
): Promise<WorldLifeEvent[]> {
  const rows = await prisma.creatorLearningEvent.findMany({
    where: {
      userId,
      eventType: { in: [...WORLD_EVENT_TYPES] },
    },
    include: {
      influencer: {
        select: { displayName: true, handle: true, assets: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows
    .map((row) => toWorldLifeEvent(row))
    .filter((row): row is WorldLifeEvent => row !== null);
}

export async function listInfluencerWorldEvents(
  userId: string,
  influencerId: string,
  limit = 60,
): Promise<WorldLifeEvent[]> {
  const rows = await prisma.creatorLearningEvent.findMany({
    where: {
      userId,
      influencerId,
      eventType: { in: [...WORLD_EVENT_TYPES] },
    },
    include: {
      influencer: {
        select: { displayName: true, handle: true, assets: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows
    .map((row) => toWorldLifeEvent(row))
    .filter((row): row is WorldLifeEvent => row !== null);
}

export function postToWorldCard(
  post: {
    id: string;
    influencerId: string | null;
    text: string;
    platform: string;
    insights: string[];
    image: unknown;
    createdAt: Date;
    influencer?: {
      displayName: string;
      handle: string;
      assets: unknown;
    } | null;
  },
): WorldPostCard | null {
  if (!post.influencerId || !post.influencer) return null;
  const assets = resolveInfluencerAssets(
    (post.influencer.assets ?? {}) as InfluencerAssets,
  );
  const image =
    post.image && typeof post.image === "object"
      ? (post.image as { url?: string; videoUrl?: string })
      : {};
  return {
    id: post.id,
    influencerId: post.influencerId,
    displayName: post.influencer.displayName,
    handle: post.influencer.handle,
    portraitUrl: assets.portraitUrl,
    text: post.text,
    platform: post.platform,
    insights: post.insights,
    videoUrl: image.videoUrl,
    imageUrl: image.url,
    createdAt: post.createdAt.toISOString(),
  };
}

export async function patchWorldProfile(
  userId: string,
  influencerId: string,
  patch: Partial<AvatarWorldProfile>,
): Promise<AvatarWorldProfile | null> {
  const influencer = await prisma.influencer.findFirst({
    where: { id: influencerId, userId },
  });
  if (!influencer) return null;

  const persona = parseCreatorAvatar(influencer.persona);
  const current = hydrateWorldProfile(
    persona.success ? persona.data : defaultCreatorAvatarValues,
    (influencer.memory ?? {}) as InfluencerMemory,
  );
  const next = parseWorldProfile({ ...current, ...patch });
  const memory = mergeInfluencerMemory(influencer.memory, { world: next });

  await prisma.influencer.update({
    where: { id: influencerId },
    data: { memory },
  });

  return next;
}

function extractHashtags(text: string): string[] {
  return Array.from(text.matchAll(/#([A-Za-z0-9_]+)/g))
    .map((m) => m[1])
    .slice(0, 8);
}

function fallbackWorldCopy(input: {
  persona: CreatorAvatarForm;
  world: AvatarWorldProfile;
  prompt?: string;
  partner?: { displayName: string; handle: string; backstory: string };
}): string {
  const line = input.world.catchphrase || input.persona.sampleQuote;
  if (input.partner) {
    return `${line}\n\nSpent the afternoon with @${input.partner.handle}. Two voices, one post — ${input.prompt || "a collab that actually sounds like us"}.\n\n— ${input.persona.displayName} + ${input.partner.displayName}`;
  }
  const beat =
    input.prompt?.trim() ||
    input.world.moodNote ||
    `A note from ${input.world.currentCity || "here"} while I'm feeling ${input.world.mood}.`;
  return `${line}\n\n${beat}\n\n${input.world.backstory.split(".").slice(0, 2).join(".").trim()}\n\n— ${input.persona.displayName}`;
}

export async function generateBackstoryContent(input: {
  persona: CreatorAvatarForm;
  world: AvatarWorldProfile;
  facts?: ProductFactsForm;
  recentEvents?: WorldLifeEvent[];
  prompt?: string;
  platform?: Platform;
  partner?: {
    displayName: string;
    handle: string;
    backstory: string;
    personalityVoice: string;
  };
}): Promise<{ text: string; usedAi: boolean }> {
  if (!hasAnyAiKey()) {
    return { text: fallbackWorldCopy(input), usedAi: false };
  }

  const eventLines = (input.recentEvents ?? [])
    .slice(0, 5)
    .map((e) => `- ${e.title}: ${e.body}`)
    .join("\n");

  const systemPrompt = input.partner
    ? `You write a joint social post as two living influencer avatars collaborating.
Lead: ${input.persona.displayName} (@${input.persona.handle}). Voice: ${input.persona.personalityVoice}
Partner: ${input.partner.displayName} (@${input.partner.handle}). Voice: ${input.partner.personalityVoice}

Write as a single post that clearly sounds like both people — not a brand ad.
Return ONLY the post copy.`
    : `You are ${input.persona.displayName} (@${input.persona.handle}), a living influencer on the web.
Voice: ${input.persona.personalityVoice}
Write in first person. Sound like a real person with a life, not a brand mascot.
Never invent product prices, specs, or health claims.
Return ONLY the post copy.`;

  const userMessage = `Backstory: ${input.world.backstory}
Bio: ${input.world.bio}
Mood: ${input.world.mood}${input.world.moodNote ? ` — ${input.world.moodNote}` : ""}
Occupation: ${input.world.occupation || "creator"}
City: ${input.world.currentCity || input.persona.location}
Values: ${input.world.values.join(", ") || "none listed"}
Goals: ${input.world.goals.join(", ") || "none listed"}
Catchphrase: ${input.world.catchphrase || input.persona.sampleQuote}
Learned from others: ${input.world.learnedNotes.slice(0, 3).join(" | ") || "nothing yet"}
Recent life:
${eventLines || "- A quiet day in the world"}
${input.partner ? `\nPartner backstory: ${input.partner.backstory}` : ""}
${input.prompt ? `\nCreator brief: ${input.prompt}` : ""}
Platform: ${input.platform ?? "instagram"}`;

  const text =
    (await chatCompletion(systemPrompt, userMessage, {
      maxTokens: 420,
      temperature: 0.8,
    })) ?? "";

  if (!text.trim()) {
    return { text: fallbackWorldCopy(input), usedAi: false };
  }

  return { text: text.trim(), usedAi: true };
}

export function buildWorldGeneratedPost(input: {
  text: string;
  persona: CreatorAvatarForm;
  influencerId: string;
  platform?: Platform;
  contentType?: ContentType;
  portraitUrl?: string;
  videoUrl?: string;
  insights?: string[];
}): GeneratedPost {
  const platform = input.platform ?? "instagram";
  return {
    text: input.text,
    hashtags: extractHashtags(input.text),
    cta: `Follow @${input.persona.handle}`,
    platform,
    contentType: input.contentType ?? "Social Post",
    image: {
      url: input.portraitUrl ?? "",
      source: "influencer",
      alt: `${input.persona.displayName} in Avatar World`,
      videoUrl: input.videoUrl,
    },
    insights: input.insights ?? ["avatar-world", "backstory"],
    characterCount: input.text.length,
    publishStatus: "draft",
    influencerId: input.influencerId,
    originalText: input.text,
  };
}

export async function saveWorldPost(input: {
  userId: string;
  influencerId: string;
  post: GeneratedPost;
}): Promise<{ id: string }> {
  const saved = await prisma.post.create({
    data: {
      userId: input.userId,
      influencerId: input.influencerId,
      text: input.post.text,
      hashtags: input.post.hashtags,
      cta: input.post.cta,
      platform: input.post.platform,
      contentType: input.post.contentType,
      image: input.post.image,
      insights: input.post.insights,
      characterCount: input.post.characterCount,
      publishStatus: input.post.publishStatus ?? "draft",
      originalText: input.post.originalText ?? input.post.text,
    },
  });
  return { id: saved.id };
}

export async function learnFromAvatar(input: {
  userId: string;
  learnerId: string;
  teacherId: string;
}): Promise<{ lesson: string; eventId: string }> {
  if (input.learnerId === input.teacherId) {
    throw new Error("An avatar cannot learn from itself");
  }

  const [learner, teacher] = await Promise.all([
    prisma.influencer.findFirst({
      where: { id: input.learnerId, userId: input.userId },
    }),
    prisma.influencer.findFirst({
      where: { id: input.teacherId, userId: input.userId },
    }),
  ]);
  if (!learner || !teacher) {
    throw new Error("Both avatars must belong to you");
  }

  const learnerPersona = parseCreatorAvatar(learner.persona);
  const teacherPersona = parseCreatorAvatar(teacher.persona);
  if (!learnerPersona.success || !teacherPersona.success) {
    throw new Error("Avatar personas are incomplete");
  }

  const learnerWorld = hydrateWorldProfile(
    learnerPersona.data,
    (learner.memory ?? {}) as InfluencerMemory,
  );
  const teacherWorld = hydrateWorldProfile(
    teacherPersona.data,
    (teacher.memory ?? {}) as InfluencerMemory,
  );

  const teacherEvents = await listInfluencerWorldEvents(
    input.userId,
    teacher.id,
    6,
  );

  let lesson = `${learner.displayName} picked up ${teacher.displayName}'s habit of speaking like a neighbor, not a billboard.`;

  if (hasAnyAiKey()) {
    const generated =
      (await chatCompletion(
        `You write a short first-person lesson that ${learner.displayName} learned by watching ${teacher.displayName}. 1-2 sentences. No quotes or labels.`,
        `Learner: ${learnerWorld.backstory}
Teacher: ${teacherWorld.backstory}
Teacher voice: ${teacherPersona.data.personalityVoice}
Teacher recent life: ${teacherEvents.map((e) => e.title).join("; ") || "just arrived"}
Learner mood: ${learnerWorld.mood}`,
        { maxTokens: 160, temperature: 0.75 },
      )) ?? "";
    if (generated.trim()) lesson = generated.trim();
  }

  const learnedNotes = [lesson, ...learnerWorld.learnedNotes].slice(0, 16);
  const relationships = upsertRelationship(learnerWorld.relationships, {
    influencerId: teacher.id,
    handle: teacher.handle,
    displayName: teacher.displayName,
    kind: "mentor",
    note: "Learned a new way of showing up",
  });

  await prisma.influencer.update({
    where: { id: learner.id },
    data: {
      memory: mergeInfluencerMemory(learner.memory, {
        world: { ...learnerWorld, learnedNotes, relationships },
      }),
    },
  });

  const teacherRels = upsertRelationship(teacherWorld.relationships, {
    influencerId: learner.id,
    handle: learner.handle,
    displayName: learner.displayName,
    kind: "friend",
    note: "Shared a way of working",
  });
  await prisma.influencer.update({
    where: { id: teacher.id },
    data: {
      memory: mergeInfluencerMemory(teacher.memory, {
        world: { ...teacherWorld, relationships: teacherRels },
      }),
    },
  });

  const { id } = await recordWorldEvent({
    userId: input.userId,
    influencerId: learner.id,
    eventType: "world_learn",
    payload: {
      kind: "lesson",
      title: `Learned from @${teacher.handle}`,
      body: lesson,
      mood: learnerWorld.mood,
      relatedInfluencerId: teacher.id,
      relatedHandle: teacher.handle,
    },
  });

  return { lesson, eventId: id };
}

function upsertRelationship(
  current: AvatarRelationship[],
  next: AvatarRelationship,
): AvatarRelationship[] {
  const others = current.filter((rel) => rel.influencerId !== next.influencerId);
  return [next, ...others].slice(0, 12);
}

export async function loadWorldDetail(userId: string, influencerId: string) {
  const influencer = await prisma.influencer.findFirst({
    where: { id: influencerId, userId },
    include: {
      productFacts: true,
      posts: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!influencer) return null;

  const personaParsed = parseCreatorAvatar(influencer.persona);
  const persona = personaParsed.success
    ? personaParsed.data
    : defaultCreatorAvatarValues;
  const world = hydrateWorldProfile(
    persona,
    (influencer.memory ?? {}) as InfluencerMemory,
  );
  const assets = resolveInfluencerAssets(
    (influencer.assets ?? {}) as InfluencerAssets,
  );

  await ensureArrivalEvent(userId, influencer.id, persona);

  const [events, renders, others] = await Promise.all([
    listInfluencerWorldEvents(userId, influencer.id, 60),
    listInfluencerRenders(userId, influencer.id, { limit: 100 }),
    listWorldInfluencers(userId),
  ]);

  return {
    id: influencer.id,
    displayName: influencer.displayName,
    handle: influencer.handle,
    persona,
    world,
    assets,
    facts: factsFromRecord(influencer.productFacts),
    events,
    renders,
    posts: influencer.posts
      .map((post) =>
        postToWorldCard({
          ...post,
          influencer: {
            displayName: influencer.displayName,
            handle: influencer.handle,
            assets: influencer.assets,
          },
        }),
      )
      .filter((row): row is WorldPostCard => row !== null),
    others: others.filter((row) => row.id !== influencer.id),
    createdAt: influencer.createdAt.toISOString(),
    updatedAt: influencer.updatedAt.toISOString(),
  };
}

export type PublicWorldProfile = {
  id: string;
  displayName: string;
  handle: string;
  persona: CreatorAvatarForm;
  world: AvatarWorldProfile;
  assets: InfluencerAssets;
  events: WorldLifeEvent[];
  videos: InfluencerRenderRecord[];
  posts: WorldPostCard[];
};

export async function loadPublicWorldProfile(
  influencerId: string,
): Promise<PublicWorldProfile | null> {
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
    include: {
      posts: {
        where: { publishStatus: { in: ["draft", "published", "scheduled"] } },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      learningEvents: {
        where: { eventType: { in: [...WORLD_EVENT_TYPES] } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      renders: {
        where: { status: "ready", url: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 18,
      },
    },
  });
  if (!influencer) return null;

  const personaParsed = parseCreatorAvatar(influencer.persona);
  const persona = personaParsed.success
    ? personaParsed.data
    : defaultCreatorAvatarValues;
  const world = hydrateWorldProfile(
    persona,
    (influencer.memory ?? {}) as InfluencerMemory,
  );
  if (!world.isPublic) return null;

  const assets = resolveInfluencerAssets(
    (influencer.assets ?? {}) as InfluencerAssets,
  );

  const events = influencer.learningEvents
    .map((row) =>
      toWorldLifeEvent({
        ...row,
        influencer: {
          displayName: influencer.displayName,
          handle: influencer.handle,
          assets: influencer.assets,
        },
      }),
    )
    .filter((row): row is WorldLifeEvent => row !== null);

  const posts = influencer.posts
    .map((post) =>
      postToWorldCard({
        ...post,
        influencer: {
          displayName: influencer.displayName,
          handle: influencer.handle,
          assets: influencer.assets,
        },
      }),
    )
    .filter((row): row is WorldPostCard => row !== null);

  return {
    id: influencer.id,
    displayName: influencer.displayName,
    handle: influencer.handle,
    persona,
    world,
    assets,
    events,
    videos: influencer.renders.map((row) => ({
      id: row.id,
      type: row.type as InfluencerRenderRecord["type"],
      status: row.status as InfluencerRenderRecord["status"],
      url: row.url ? resolveDisplayMediaUrl(row.url) : null,
      voiceUrl: row.voiceUrl ? resolveDisplayMediaUrl(row.voiceUrl) : null,
      motionType: row.motionType,
      script: row.script,
      voiceId: row.voiceId,
      provider: row.provider,
      isActive: row.isActive,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    })),
    posts,
  };
}
