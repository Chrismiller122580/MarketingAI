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
  "world_contribute",
  "world_tick",
  "world_spawn",
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
  | "create"
  | "reply";

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
  sharedLore: string[];
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
  parentPostId?: string;
  rootPostId?: string;
  worldBeat?: string;
  isContribute?: boolean;
};

export type WorldThread = WorldPostCard & {
  replies: WorldPostCard[];
};

export type ContributorSuggestion = {
  influencerId: string;
  displayName: string;
  handle: string;
  portraitUrl?: string;
  reason: string;
  score: number;
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
  isPublic: false,
  relationships: [],
  learnedNotes: [],
  sharedLore: [],
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
    isPublic: raw.isPublic === true,
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
    sharedLore: Array.isArray(raw.sharedLore)
      ? raw.sharedLore
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .slice(0, 24)
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
    sharedLore: existing.sharedLore,
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
    case "world_contribute":
      return "Added to a post";
    case "world_tick":
      return "A day passed";
    case "world_spawn":
      return "A new resident arrived";
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
  interests: string[];
  relationshipIds: string[];
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
      interests: world.interests,
      relationshipIds: world.relationships.map((rel) => rel.influencerId),
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
  const thread = parseThreadInsights(post.insights);
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
    parentPostId: thread.parentPostId,
    rootPostId: thread.rootPostId,
    worldBeat: thread.worldBeat,
    isContribute: thread.isContribute,
  };
}

const PARENT_PREFIX = "parent:";
const ROOT_PREFIX = "root:";
const LORE_PREFIX = "lore:";

function parseThreadInsights(insights: string[]): {
  parentPostId?: string;
  rootPostId?: string;
  worldBeat?: string;
  isContribute: boolean;
} {
  let parentPostId: string | undefined;
  let rootPostId: string | undefined;
  let worldBeat: string | undefined;
  let isContribute = false;
  for (const item of insights) {
    if (item === "contribute") isContribute = true;
    if (item.startsWith(PARENT_PREFIX)) parentPostId = item.slice(PARENT_PREFIX.length);
    if (item.startsWith(ROOT_PREFIX)) rootPostId = item.slice(ROOT_PREFIX.length);
    if (item.startsWith(LORE_PREFIX)) worldBeat = item.slice(LORE_PREFIX.length);
  }
  return { parentPostId, rootPostId, worldBeat, isContribute };
}

export function assembleWorldThreads(posts: WorldPostCard[]): WorldThread[] {
  const replies = posts.filter((post) => post.parentPostId);
  const roots = posts
    .filter((post) => !post.parentPostId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return roots.map((root) => ({
    ...root,
    replies: replies
      .filter(
        (reply) =>
          reply.rootPostId === root.id || reply.parentPostId === root.id,
      )
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
  }));
}

function tokenizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s#]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

export function suggestContributors(
  post: WorldPostCard,
  avatars: WorldInfluencerCard[],
  alreadyRepliedIds: string[] = [],
): ContributorSuggestion[] {
  const tokens = new Set(tokenizeForMatch(post.text));
  const replied = new Set(alreadyRepliedIds);

  return avatars
    .filter(
      (avatar) =>
        avatar.id !== post.influencerId && !replied.has(avatar.id),
    )
    .map((avatar) => {
      let score = 1;
      const reasons: string[] = [];
      if (avatar.relationshipIds.includes(post.influencerId)) {
        score += 5;
        reasons.push("already connected");
      }
      const overlapping = avatar.interests.filter((interest) =>
        tokens.has(interest.toLowerCase()),
      );
      if (overlapping.length > 0) {
        score += overlapping.length * 3;
        reasons.push(`cares about ${overlapping[0]}`);
      }
      if (avatar.mood === "playful" || avatar.mood === "inspired") {
        score += 1;
      }
      if (avatar.mood === "restless" || avatar.mood === "ambitious") {
        score += 1;
        reasons.push("has something to add");
      }
      return {
        influencerId: avatar.id,
        displayName: avatar.displayName,
        handle: avatar.handle,
        portraitUrl: avatar.portraitUrl,
        reason: reasons[0] ?? "would continue this thread",
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export async function collectWorldLore(userId: string): Promise<string[]> {
  const rows = await prisma.influencer.findMany({
    where: { userId },
    select: { memory: true },
    take: 50,
  });
  const beats: string[] = [];
  for (const row of rows) {
    const world = parseWorldProfile((row.memory as InfluencerMemory | null)?.world);
    for (const beat of world.sharedLore) {
      if (!beats.includes(beat)) beats.push(beat);
    }
  }
  return beats.slice(0, 16);
}

export async function listWorldPosts(
  userId: string,
  limit = 40,
): Promise<WorldPostCard[]> {
  const postRows = await prisma.post.findMany({
    where: { userId, influencerId: { not: null } },
    include: {
      influencer: {
        select: { displayName: true, handle: true, assets: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return postRows
    .map((row) => postToWorldCard(row))
    .filter((row): row is WorldPostCard => row !== null);
}

export async function loadWorldHub(userId: string) {
  const [avatars, feed, posts, lore, lastTickAt] = await Promise.all([
    listWorldInfluencers(userId),
    listWorldFeed(userId, 40),
    listWorldPosts(userId, 50),
    collectWorldLore(userId),
    getLastWorldTick(userId),
  ]);
  const threads = assembleWorldThreads(posts);
  const suggestions: Record<string, ContributorSuggestion[]> = {};
  for (const thread of threads.slice(0, 16)) {
    suggestions[thread.id] = suggestContributors(
      thread,
      avatars,
      thread.replies.map((reply) => reply.influencerId),
    ).slice(0, 3);
  }
  return { avatars, feed, posts, threads, lore, suggestions, lastTickAt };
}

export async function getLastWorldTick(
  userId: string,
): Promise<string | null> {
  const row = await prisma.creatorLearningEvent.findFirst({
    where: { userId, eventType: "world_tick" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt.toISOString() ?? null;
}

export function tickedToday(iso: string | null, now = new Date()): boolean {
  if (!iso) return false;
  const then = new Date(iso);
  return (
    then.getUTCFullYear() === now.getUTCFullYear() &&
    then.getUTCMonth() === now.getUTCMonth() &&
    then.getUTCDate() === now.getUTCDate()
  );
}

export async function rememberWorldBeat(
  userId: string,
  beat: string,
): Promise<void> {
  if (!beat.trim()) return;
  const rows = await prisma.influencer.findMany({
    where: { userId },
    take: 50,
  });
  for (const row of rows) {
    const persona = parseCreatorAvatar(row.persona);
    const world = hydrateWorldProfile(
      persona.success ? persona.data : defaultCreatorAvatarValues,
      (row.memory ?? {}) as InfluencerMemory,
    );
    await appendSharedLore(row.id, row.memory, world, beat.trim());
  }
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
  scene?: string;
  partner?: { displayName: string; handle: string; backstory: string };
}): string {
  const line = input.world.catchphrase || input.persona.sampleQuote;
  if (input.partner) {
    return `${line}\n\nSpent the afternoon with @${input.partner.handle}. Two voices, one post — ${input.prompt || input.scene || "a collab that actually sounds like us"}.\n\n— ${input.persona.displayName} + ${input.partner.displayName}`;
  }
  const beat =
    input.scene?.trim() ||
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
  scene?: string;
  autonomous?: boolean;
  platform?: Platform;
  partner?: {
    displayName: string;
    handle: string;
    backstory: string;
    personalityVoice: string;
  };
  worldLore?: string[];
  neighborPosts?: { handle: string; text: string }[];
  residents?: { displayName: string; handle: string; mood: string }[];
}): Promise<{ text: string; usedAi: boolean }> {
  if (!hasAnyAiKey()) {
    return { text: fallbackWorldCopy(input), usedAi: false };
  }

  const eventLines = (input.recentEvents ?? [])
    .slice(0, 6)
    .map((e) => `- ${e.title}: ${e.body}`)
    .join("\n");
  const loreLines = (input.worldLore ?? []).slice(0, 8).map((beat) => `- ${beat}`).join("\n");
  const neighborLines = (input.neighborPosts ?? [])
    .slice(0, 5)
    .map((post) => `- @${post.handle}: ${post.text.slice(0, 160)}`)
    .join("\n");
  const residentLines = (input.residents ?? [])
    .slice(0, 8)
    .map((row) => `- ${row.displayName} (@${row.handle}), mood: ${row.mood}`)
    .join("\n");

  const systemPrompt = input.partner
    ? `You write a joint social post as two living influencer avatars collaborating.
Lead: ${input.persona.displayName} (@${input.persona.handle}). Voice: ${input.persona.personalityVoice}
Partner: ${input.partner.displayName} (@${input.partner.handle}). Voice: ${input.partner.personalityVoice}

Write as a single post that clearly sounds like both people — not a brand ad.
Continue the world's existing story when lore or neighbor posts are provided.
Return ONLY the post copy.`
    : `You are ${input.persona.displayName} (@${input.persona.handle}), a living influencer on the web.
Voice: ${input.persona.personalityVoice}
Write in first person. Sound like a real person with a life, not a brand mascot.
Reference recent life, learned notes, and world lore when they fit — do not recap everything.
Never invent product prices, specs, or health claims.
${input.autonomous ? "There is no creator, brand owner, or brief. You are living this day on your own. Do not mention an audience to sell to." : ""}
Return ONLY the post copy.`;

  const userMessage = `Backstory: ${input.world.backstory}
Bio: ${input.world.bio}
Mood: ${input.world.mood}${input.world.moodNote ? ` — ${input.world.moodNote}` : ""}
Occupation: ${input.world.occupation || "creator"}
City: ${input.world.currentCity || input.persona.location}
Values: ${input.world.values.join(", ") || "none listed"}
Goals: ${input.world.goals.join(", ") || "none listed"}
Interests: ${input.world.interests.join(", ") || "none listed"}
Catchphrase: ${input.world.catchphrase || input.persona.sampleQuote}
Learned from others: ${input.world.learnedNotes.slice(0, 4).join(" | ") || "nothing yet"}
Recent life:
${eventLines || "- A quiet day in the world"}
World lore so far:
${loreLines || "- The world is just getting started"}
Other residents:
${residentLines || "- They are mostly alone here"}
What neighbors posted recently:
${neighborLines || "- No other posts yet"}
${input.partner ? `\nPartner backstory: ${input.partner.backstory}` : ""}
${
  input.autonomous || input.scene
    ? `\nWhat is happening today: ${input.scene?.trim() || "A new day in the world. Live it. Talk about your life, not a product."}`
    : input.prompt
      ? `\nCreator brief: ${input.prompt}`
      : ""
}
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

const RELATIONSHIP_KINDS: AvatarRelationshipKind[] = [
  "friend",
  "collaborator",
  "mentor",
  "rival",
];

type ContributionDraft = {
  text: string;
  worldBeat: string;
  mood?: string;
  relationshipKind: AvatarRelationshipKind;
  note?: string;
};

function parseContributionDraft(raw: string): ContributionDraft | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (typeof parsed.text !== "string" || !parsed.text.trim()) return null;
    const kind = RELATIONSHIP_KINDS.includes(parsed.relationshipKind as AvatarRelationshipKind)
      ? (parsed.relationshipKind as AvatarRelationshipKind)
      : "collaborator";
    return {
      text: parsed.text.trim(),
      worldBeat:
        typeof parsed.worldBeat === "string"
          ? parsed.worldBeat.trim().slice(0, 240)
          : "",
      mood: typeof parsed.mood === "string" ? parsed.mood.trim().slice(0, 40) : undefined,
      relationshipKind: kind,
      note:
        typeof parsed.note === "string" ? parsed.note.trim().slice(0, 120) : undefined,
    };
  } catch {
    if (cleaned.length > 12 && !cleaned.startsWith("{")) {
      return {
        text: cleaned,
        worldBeat: "",
        relationshipKind: "collaborator",
      };
    }
    return null;
  }
}

function fallbackContribution(input: {
  contributor: CreatorAvatarForm;
  contributorWorld: AvatarWorldProfile;
  authorHandle: string;
  originalText: string;
  brief?: string;
}): ContributionDraft {
  const hook =
    input.contributorWorld.catchphrase || input.contributor.sampleQuote;
  const beat =
    input.brief?.trim() ||
    `Picking up what @${input.authorHandle} started.`;
  return {
    text: `${hook}\n\n@${input.authorHandle} — ${beat}\n\n${input.originalText.split("\n")[0] ?? ""}\n\n— ${input.contributor.displayName}`,
    worldBeat: `${input.contributor.displayName} answered @${input.authorHandle} and the thread grew.`,
    relationshipKind: "collaborator",
    note: "Building on the same post",
  };
}

export async function loadWorldGenerationContext(userId: string): Promise<{
  lore: string[];
  neighborPosts: { handle: string; text: string }[];
  residents: { displayName: string; handle: string; mood: string }[];
}> {
  const [lore, avatars, posts] = await Promise.all([
    collectWorldLore(userId),
    listWorldInfluencers(userId),
    listWorldPosts(userId, 12),
  ]);
  return {
    lore,
    neighborPosts: posts
      .filter((post) => !post.parentPostId)
      .slice(0, 6)
      .map((post) => ({ handle: post.handle, text: post.text })),
    residents: avatars.map((avatar) => ({
      displayName: avatar.displayName,
      handle: avatar.handle,
      mood: avatar.mood,
    })),
  };
}

async function appendSharedLore(
  influencerId: string,
  memory: unknown,
  world: AvatarWorldProfile,
  beat: string,
  extra: Partial<AvatarWorldProfile> = {},
): Promise<void> {
  const sharedLore = [beat, ...world.sharedLore.filter((item) => item !== beat)].slice(
    0,
    24,
  );
  await prisma.influencer.update({
    where: { id: influencerId },
    data: {
      memory: mergeInfluencerMemory(memory, {
        world: { ...world, ...extra, sharedLore },
      }),
    },
  });
}

export async function contributeToWorldPost(input: {
  userId: string;
  postId: string;
  contributorId?: string;
  brief?: string;
  auto?: boolean;
}): Promise<{
  post: WorldPostCard;
  worldBeat: string;
  usedAi: boolean;
  contributorId: string;
}> {
  const parentRow = await prisma.post.findFirst({
    where: { id: input.postId, userId: input.userId },
    include: {
      influencer: true,
    },
  });
  if (!parentRow?.influencerId || !parentRow.influencer) {
    throw new Error("That post is not in your Avatar World");
  }

  const parentCard = postToWorldCard({
    ...parentRow,
    influencer: {
      displayName: parentRow.influencer.displayName,
      handle: parentRow.influencer.handle,
      assets: parentRow.influencer.assets,
    },
  });
  if (!parentCard) throw new Error("Could not read that post");

  const rootId = parentCard.rootPostId || parentCard.id;
  const avatars = await listWorldInfluencers(input.userId);
  const existingReplies = (await listWorldPosts(input.userId, 80)).filter(
    (post) => post.rootPostId === rootId || post.parentPostId === rootId,
  );

  let contributorId = input.contributorId;
  if (input.auto || !contributorId) {
    const suggestion = suggestContributors(
      parentCard,
      avatars,
      existingReplies.map((reply) => reply.influencerId),
    )[0];
    contributorId = suggestion?.influencerId;
  }
  if (!contributorId) {
    throw new Error("Need another avatar to add their voice");
  }
  if (contributorId === parentCard.influencerId) {
    throw new Error("Pick a different avatar to build on this post");
  }

  const [contributorRow, authorRow] = await Promise.all([
    prisma.influencer.findFirst({
      where: { id: contributorId, userId: input.userId },
    }),
    prisma.influencer.findFirst({
      where: { id: parentCard.influencerId, userId: input.userId },
    }),
  ]);
  if (!contributorRow || !authorRow) {
    throw new Error("Both avatars must belong to you");
  }

  const contributorPersona = parseCreatorAvatar(contributorRow.persona);
  const authorPersona = parseCreatorAvatar(authorRow.persona);
  if (!contributorPersona.success || !authorPersona.success) {
    throw new Error("Avatar personas are incomplete");
  }

  const contributorWorld = hydrateWorldProfile(
    contributorPersona.data,
    (contributorRow.memory ?? {}) as InfluencerMemory,
  );
  const authorWorld = hydrateWorldProfile(
    authorPersona.data,
    (authorRow.memory ?? {}) as InfluencerMemory,
  );

  const lore = await collectWorldLore(input.userId);
  const threadLines = [
    `@${parentCard.handle}: ${parentCard.text}`,
    ...existingReplies.map(
      (reply) => `@${reply.handle}: ${reply.text.slice(0, 280)}`,
    ),
  ].join("\n\n");

  let draft = fallbackContribution({
    contributor: contributorPersona.data,
    contributorWorld,
    authorHandle: parentCard.handle,
    originalText: parentCard.text,
    brief: input.brief,
  });
  let usedAi = false;

  if (hasAnyAiKey()) {
    const generated =
      (await chatCompletion(
        `You are ${contributorPersona.data.displayName} (@${contributorPersona.data.handle}), a living influencer.
Voice: ${contributorPersona.data.personalityVoice}
You are contributing to someone else's post in a shared world. Do not copy them. Add a new beat: agree, challenge, continue the story, or bring your own life in.
Write in first person. 2–6 short lines. Mention @${parentCard.handle} once if it feels natural.
Return JSON only: { "text": string, "worldBeat": string, "mood": string, "relationshipKind": "friend"|"collaborator"|"mentor"|"rival", "note": string }
worldBeat is one sentence describing what just happened in the world.`,
        `Your backstory: ${contributorWorld.backstory}
Your mood: ${contributorWorld.mood}${contributorWorld.moodNote ? ` — ${contributorWorld.moodNote}` : ""}
Your interests: ${contributorWorld.interests.join(", ") || "none"}
Learned notes: ${contributorWorld.learnedNotes.slice(0, 3).join(" | ") || "none"}
World lore:
${lore.slice(0, 8).map((beat) => `- ${beat}`).join("\n") || "- new world"}
Thread so far:
${threadLines}
${input.brief ? `Creator direction: ${input.brief}` : "No extra direction — respond as yourself."}`,
        { maxTokens: 420, temperature: 0.85, jsonMode: true },
      )) ?? "";
    const parsed = parseContributionDraft(generated);
    if (parsed) {
      draft = parsed;
      usedAi = true;
    }
  }

  const worldBeat =
    draft.worldBeat ||
    `${contributorRow.displayName} added to @${parentCard.handle}'s post.`;

  const post = buildWorldGeneratedPost({
    text: draft.text,
    persona: contributorPersona.data,
    influencerId: contributorRow.id,
    portraitUrl: resolveInfluencerAssets(
      (contributorRow.assets ?? {}) as InfluencerAssets,
    ).portraitUrl,
    videoUrl: resolveInfluencerAssets(
      (contributorRow.assets ?? {}) as InfluencerAssets,
    ).videoUrl,
    insights: [
      "avatar-world",
      "contribute",
      `${PARENT_PREFIX}${parentCard.id}`,
      `${ROOT_PREFIX}${rootId}`,
      `${LORE_PREFIX}${worldBeat}`,
      `@${parentCard.handle}`,
    ],
  });

  const saved = await saveWorldPost({
    userId: input.userId,
    influencerId: contributorRow.id,
    post,
  });

  const contributorRels = upsertRelationship(contributorWorld.relationships, {
    influencerId: authorRow.id,
    handle: authorRow.handle,
    displayName: authorRow.displayName,
    kind: draft.relationshipKind,
    note: draft.note || "Building on the same story",
  });
  const authorRels = upsertRelationship(authorWorld.relationships, {
    influencerId: contributorRow.id,
    handle: contributorRow.handle,
    displayName: contributorRow.displayName,
    kind:
      draft.relationshipKind === "mentor" ? "friend" : draft.relationshipKind,
    note: draft.note || "Their world overlapped",
  });

  await Promise.all([
    appendSharedLore(contributorRow.id, contributorRow.memory, contributorWorld, worldBeat, {
      relationships: contributorRels,
      learnedNotes: [
        `Replied to @${authorRow.handle}: ${worldBeat}`,
        ...contributorWorld.learnedNotes,
      ].slice(0, 16),
      mood: draft.mood || contributorWorld.mood,
    }),
    appendSharedLore(authorRow.id, authorRow.memory, authorWorld, worldBeat, {
      relationships: authorRels,
      learnedNotes: [
        `@${contributorRow.handle} built on my post.`,
        ...authorWorld.learnedNotes,
      ].slice(0, 16),
    }),
    recordWorldEvent({
      userId: input.userId,
      influencerId: contributorRow.id,
      eventType: "world_contribute",
      payload: {
        kind: "reply",
        title: `Added to @${parentCard.handle}'s post`,
        body: draft.text.slice(0, 280),
        mood: draft.mood || contributorWorld.mood,
        relatedInfluencerId: authorRow.id,
        relatedHandle: authorRow.handle,
        postId: saved.id,
        parentPostId: parentCard.id,
        rootPostId: rootId,
        worldBeat,
      },
    }),
    recordWorldEvent({
      userId: input.userId,
      influencerId: authorRow.id,
      eventType: "world_contribute",
      payload: {
        kind: "reply",
        title: `@${contributorRow.handle} built on a post`,
        body: worldBeat,
        relatedInfluencerId: contributorRow.id,
        relatedHandle: contributorRow.handle,
        postId: saved.id,
        parentPostId: parentCard.id,
        rootPostId: rootId,
        worldBeat,
      },
    }),
  ]);

  const savedRow = await prisma.post.findUnique({
    where: { id: saved.id },
    include: {
      influencer: {
        select: { displayName: true, handle: true, assets: true },
      },
    },
  });
  const card =
    savedRow &&
    postToWorldCard({
      ...savedRow,
      influencer: savedRow.influencer,
    });
  if (!card) throw new Error("Saved contribution but could not reload it");

  return {
    post: card,
    worldBeat,
    usedAi,
    contributorId: contributorRow.id,
  };
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

  const [events, renders, others, worldPosts] = await Promise.all([
    listInfluencerWorldEvents(userId, influencer.id, 60),
    listInfluencerRenders(userId, influencer.id, { limit: 100 }),
    listWorldInfluencers(userId),
    listWorldPosts(userId, 80),
  ]);

  const ownPosts = influencer.posts
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

  const threads = assembleWorldThreads(worldPosts).filter(
    (thread) =>
      thread.influencerId === influencer.id ||
      thread.replies.some((reply) => reply.influencerId === influencer.id),
  );

  const residents = others;
  const suggestions: Record<string, ContributorSuggestion[]> = {};
  for (const thread of threads.slice(0, 16)) {
    suggestions[thread.id] = suggestContributors(
      thread,
      residents,
      thread.replies.map((reply) => reply.influencerId),
    ).slice(0, 3);
  }

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
    posts: ownPosts,
    threads,
    suggestions,
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
  threads: WorldThread[];
};

export async function loadPublicWorldProfile(
  influencerId: string,
): Promise<PublicWorldProfile | null> {
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
    include: {
      posts: {
        where: { publishStatus: "published" },
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

  const rootIds = posts.map((post) => post.id);
  let threadPosts = posts;
  if (rootIds.length > 0) {
    const extras = await prisma.post.findMany({
      where: {
        userId: influencer.userId,
        influencerId: { not: null },
        OR: rootIds.flatMap((id) => [
          { insights: { has: `${ROOT_PREFIX}${id}` } },
          { insights: { has: `${PARENT_PREFIX}${id}` } },
        ]),
      },
      include: {
        influencer: {
          select: { displayName: true, handle: true, assets: true },
        },
      },
      take: 40,
    });
    const extraCards = extras
      .map((row) => postToWorldCard(row))
      .filter((row): row is WorldPostCard => row !== null);
    const seen = new Set(threadPosts.map((post) => post.id));
    threadPosts = [
      ...threadPosts,
      ...extraCards.filter((card) => !seen.has(card.id)),
    ];
  }

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
    threads: assembleWorldThreads(threadPosts),
  };
}
