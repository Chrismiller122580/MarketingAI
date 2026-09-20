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
import { mergeInfluencerMemory, type InfluencerMemory } from "./learning";
import { loadWorldEconomy, streetForOccupation, type WorldEconomySnapshot, type WorldPlaceKind } from "./world-economy";

export const WORLD_EVENT_TYPES = [
  "life_event",
  "world_learn",
  "world_collab",
  "world_merge",
  "world_post",
  "world_contribute",
  "world_tick",
  "world_spawn",
  "world_chat",
  "world_wage",
  "world_listing",
  "world_sale",
  "world_rent",
  "world_grocery",
  "world_hangout",
  "world_grow",
  "world_family",
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
  | "reply"
  | "chat"
  | "wage"
  | "listing"
  | "sale"
  | "rent"
  | "grocery"
  | "hangout"
  | "grow"
  | "family";

export type AvatarRelationshipKind =
  | "friend"
  | "collaborator"
  | "mentor"
  | "rival"
  | "neighbor"
  | "family"
  | "partner";

export type AvatarRelationship = {
  influencerId: string;
  handle: string;
  displayName: string;
  kind: AvatarRelationshipKind;
  note?: string;
  closeness?: number;
  household?: boolean;
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

export type WorldChatTurn = {
  influencerId: string;
  displayName: string;
  handle: string;
  portraitUrl?: string;
  text: string;
};

export type WorldChatCard = {
  id: string;
  conversationId: string;
  beat: string;
  turns: WorldChatTurn[];
  createdAt: string;
  placeId?: string;
  placeName?: string;
};

export type ContributorSuggestion = {
  influencerId: string;
  displayName: string;
  handle: string;
  portraitUrl?: string;
  reason: string;
  score: number;
};

export const RELATIONSHIP_KINDS: AvatarRelationshipKind[] = [
  "friend",
  "collaborator",
  "mentor",
  "rival",
  "neighbor",
  "family",
  "partner",
];

const RELATIONSHIP_RANK: Record<AvatarRelationshipKind, number> = {
  rival: 1,
  collaborator: 2,
  neighbor: 3,
  friend: 4,
  mentor: 5,
  family: 6,
  partner: 7,
};

function parseRelationshipKind(value: unknown): AvatarRelationshipKind {
  if (value === "spouse") return "partner";
  if (value === "parent" || value === "child" || value === "sibling") {
    return "family";
  }
  if (
    typeof value === "string" &&
    RELATIONSHIP_KINDS.includes(value as AvatarRelationshipKind)
  ) {
    return value as AvatarRelationshipKind;
  }
  return "friend";
}

function clampCloseness(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(8, Math.round(n)));
}

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
              typeof (rel as AvatarRelationship).influencerId === "string" &&
              typeof (rel as AvatarRelationship).handle === "string" &&
              typeof (rel as AvatarRelationship).displayName === "string",
          )
          .map((rel) => ({
            influencerId: rel.influencerId,
            handle: rel.handle,
            displayName: rel.displayName,
            kind: parseRelationshipKind(rel.kind),
            note: typeof rel.note === "string" ? rel.note : undefined,
            closeness: clampCloseness(rel.closeness),
            household: rel.household === true || parseRelationshipKind(rel.kind) === "partner",
          }))
          .slice(0, 16)
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
    case "world_chat":
      return "Talked with a neighbor";
    case "world_hangout":
      return "Hung out";
    case "world_wage":
      return "Got paid";
    case "world_listing":
      return "Put something up for sale";
    case "world_sale":
      return "Bought something";
    case "world_rent":
      return "Paid the rent";
    case "world_grocery":
      return "Bought groceries";
    case "world_grow":
      return "Grew closer";
    case "world_family":
      return "Built a life together";
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
  partnerId?: string;
  partnerName?: string;
  familyNames: string[];
  relationshipStatus: string;
  street: string;
  balance: number;
  wage: number;
  rent: number;
  employer: string;
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
      partnerId: world.relationships.find((rel) => rel.kind === "partner")
        ?.influencerId,
      partnerName: world.relationships.find((rel) => rel.kind === "partner")
        ?.displayName,
      familyNames: world.relationships
        .filter((rel) => rel.kind === "family" || rel.kind === "partner")
        .map((rel) => rel.displayName),
      relationshipStatus: world.relationshipStatus,
      street: streetForOccupation(
        world.occupation,
        persona.success ? persona.data.location : world.currentCity,
      ),
      balance: 0,
      wage: 0,
      rent: 0,
      employer: "",
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export type PublicWorldCard = {
  id: string;
  displayName: string;
  handle: string;
  occupation: string;
  location: string;
  bio: string;
  mood: string;
  portraitUrl?: string;
  videoUrl?: string;
};

export type PublicTownResident = PublicWorldCard & {
  street: string;
  employer: string;
  isPublic: boolean;
  keepPlace?: string;
  keepPlaceKind?: WorldPlaceKind;
  partnerName?: string;
  familyNames: string[];
  relationshipStatus: string;
};

export async function listPublicWorldAvatars(): Promise<PublicWorldCard[]> {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
    take: 20,
  });
  if (admins.length === 0) return [];

  const cards: PublicWorldCard[] = [];
  for (const admin of admins) {
    const owned = await listWorldInfluencers(admin.id);
    for (const row of owned) {
      if (!row.isPublic) continue;
      cards.push({
        id: row.id,
        displayName: row.displayName,
        handle: row.handle,
        occupation: row.occupation,
        location: row.location,
        bio: row.bio,
        mood: row.mood,
        portraitUrl: row.portraitUrl,
        videoUrl: row.videoUrl,
      });
    }
  }
  return cards.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export type PublicWorldTown = {
  avatars: PublicTownResident[];
  residents: PublicTownResident[];
  economy: {
    currencyLabel: string;
    treasury: number;
    listings: WorldEconomySnapshot["listings"];
    places: WorldEconomySnapshot["places"];
  } | null;
  threads: WorldThread[];
  chats: WorldChatCard[];
  lore: string[];
  lastTickAt: string | null;
  livedToday: boolean;
};

const EMPTY_PUBLIC_TOWN: PublicWorldTown = {
  avatars: [],
  residents: [],
  economy: null,
  threads: [],
  chats: [],
  lore: [],
  lastTickAt: null,
  livedToday: false,
};

function isOwnerlessWorldPost(post: WorldPostCard): boolean {
  return (
    post.insights.includes("avatar-world") ||
    post.insights.includes("ownerless") ||
    post.insights.includes("backstory")
  );
}

export async function listPublicWorldTown(): Promise<PublicWorldTown> {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
    take: 20,
  });
  if (admins.length === 0) return EMPTY_PUBLIC_TOWN;

  for (const admin of admins) {
    const owned = await prisma.influencer.count({ where: { userId: admin.id } });
    if (owned === 0) continue;

    const [hubAvatars, posts, chats, lore, lastTickAt, snap] = await Promise.all([
      listWorldInfluencers(admin.id),
      listWorldPosts(admin.id, 40),
      listWorldChats(admin.id, 10),
      collectWorldLore(admin.id),
      getLastWorldTick(admin.id),
      loadWorldEconomy(admin.id),
    ]);

    const keepById = new Map(
      snap.places
        .filter((place) => place.keeperId)
        .map((place) => [place.keeperId!, place] as const),
    );
    const byAccount = new Map(
      snap.accounts.map((row) => [row.influencerId, row] as const),
    );

    const residents: PublicTownResident[] = hubAvatars.map((row) => {
      const keep = keepById.get(row.id);
      const account = byAccount.get(row.id);
      return {
        id: row.id,
        displayName: row.displayName,
        handle: row.handle,
        occupation: row.occupation,
        location: row.location,
        bio: row.bio,
        mood: row.mood,
        portraitUrl: row.portraitUrl,
        videoUrl: row.videoUrl,
        street: row.street,
        employer: account?.employer || row.employer,
        isPublic: row.isPublic,
        keepPlace: keep?.name,
        keepPlaceKind: keep?.kind,
        partnerName: row.partnerName,
        familyNames: row.familyNames,
        relationshipStatus: row.relationshipStatus,
      };
    });

    const worldPosts = posts.filter(isOwnerlessWorldPost);

    return {
      avatars: residents.filter((row) => row.isPublic),
      residents,
      economy: {
        currencyLabel: snap.currencyLabel,
        treasury: snap.treasury,
        listings: snap.listings.slice(0, 12),
        places: snap.places,
      },
      threads: assembleWorldThreads(worldPosts).slice(0, 12),
      chats,
      lore: lore.slice(0, 8),
      lastTickAt,
      livedToday: tickedToday(lastTickAt),
    };
  }

  return EMPTY_PUBLIC_TOWN;
}

export async function findUsableInfluencer(userId: string, influencerId: string) {
  const influencer = await prisma.influencer.findFirst({
    where: { id: influencerId },
    include: { productFacts: true },
  });
  if (!influencer) return null;
  if (influencer.userId === userId) {
    return { influencer, owned: true as const };
  }
  if (worldFromMemory(influencer.memory).isPublic) {
    return { influencer, owned: false as const };
  }
  return null;
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
  const [avatars, feed, posts, lore, lastTickAt, chats, economy] = await Promise.all([
    listWorldInfluencers(userId),
    listWorldFeed(userId, 40),
    listWorldPosts(userId, 50),
    collectWorldLore(userId),
    getLastWorldTick(userId),
    listWorldChats(userId, 12),
    loadWorldEconomy(userId),
  ]);
  const byAccount = new Map(
    economy.accounts.map((row) => [row.influencerId, row]),
  );
  const withMoney = avatars.map((avatar) => {
    const account = byAccount.get(avatar.id);
    return {
      ...avatar,
      balance: account?.balance ?? 0,
      wage: account?.wage ?? 0,
      rent: account?.rent ?? 0,
      employer: account?.employer ?? "",
    };
  });
  const threads = assembleWorldThreads(posts);
  const suggestions: Record<string, ContributorSuggestion[]> = {};
  for (const thread of threads.slice(0, 16)) {
    suggestions[thread.id] = suggestContributors(
      thread,
      withMoney,
      thread.replies.map((reply) => reply.influencerId),
    ).slice(0, 3);
  }
  return {
    avatars: withMoney,
    feed,
    posts,
    threads,
    lore,
    suggestions,
    lastTickAt,
    chats,
    economy,
  };
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
  const city = input.world.currentCity || input.persona.location || "here";
  if (input.partner) {
    return `${line}\n\nRan into @${input.partner.handle} today. ${input.prompt || input.scene || "We talked like people who actually live here."}\n\n— ${input.persona.displayName}`;
  }
  const beat =
    input.scene?.trim() ||
    input.prompt?.trim() ||
    input.world.moodNote ||
    `A note from ${city} while I'm feeling ${input.world.mood}.`;
  return `${line}\n\n${beat}\n\n— ${input.persona.displayName}`;
}

const OWNERLESS_RULES = `There is no creator, brand owner, company, product, campaign, brief, or audience. Never mention prices, features, offers, discounts, "as an influencer", or a follow CTA. You are a person living a day. Talk about craft, weather, neighbors, food, work, and feeling.`;

export async function generateBackstoryContent(input: {
  persona: CreatorAvatarForm;
  world: AvatarWorldProfile;
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
  residents?: {
    displayName: string;
    handle: string;
    mood: string;
    occupation?: string;
    location?: string;
  }[];
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
    .map((row) => {
      const job = row.occupation ? `, ${row.occupation}` : "";
      const city = row.location ? ` in ${row.location}` : "";
      return `- ${row.displayName} (@${row.handle})${job}${city}, mood: ${row.mood}`;
    })
    .join("\n");

  const happening =
    input.scene?.trim() ||
    input.prompt?.trim() ||
    (input.autonomous
      ? "A new day in the world. Live it. Talk about your life, not a product."
      : "");

  const systemPrompt = input.partner
    ? `You write as two people who live in the same world, talking in one shared note.
Lead: ${input.persona.displayName} (@${input.persona.handle}). Voice: ${input.persona.personalityVoice}
Partner: ${input.partner.displayName} (@${input.partner.handle}). Voice: ${input.partner.personalityVoice}

${OWNERLESS_RULES}
Sound like both people — not a brand ad, not a collab announcement.
Return ONLY the note.`
    : `You are ${input.persona.displayName} (@${input.persona.handle}), a person living in a shared world.
Voice: ${input.persona.personalityVoice}
Write in first person. Sound like a real person with a life.
${OWNERLESS_RULES}
Reference recent life and world lore when they fit — do not recap everything.
Return ONLY the post copy.`;

  const userMessage = `Backstory: ${input.world.backstory}
Bio: ${input.world.bio}
Mood: ${input.world.mood}${input.world.moodNote ? ` — ${input.world.moodNote}` : ""}
Occupation: ${input.world.occupation || "neighbor"}
City: ${input.world.currentCity || input.persona.location}
Values: ${input.world.values.join(", ") || "none listed"}
Goals: ${input.world.goals.join(", ") || "none listed"}
Interests: ${input.world.interests.join(", ") || "none listed"}
Catchphrase: ${input.world.catchphrase || input.persona.sampleQuote}
Notes from neighbors: ${input.world.learnedNotes.slice(0, 4).join(" | ") || "nothing yet"}
People in your life: ${
    input.world.relationships.length
      ? input.world.relationships
          .slice(0, 6)
          .map(
            (rel) =>
              `${rel.displayName} (${rel.kind}${rel.note ? ` — ${rel.note}` : ""})`,
          )
          .join("; ")
      : "still figuring out who they are to you"
  }
Relationship: ${input.world.relationshipStatus || "unattached"}
Recent life:
${eventLines || "- A quiet day in the world"}
World lore so far:
${loreLines || "- The world is just getting started"}
Other residents:
${residentLines || "- They are mostly alone here"}
What neighbors posted recently:
${neighborLines || "- No other posts yet"}
${input.partner ? `\nPartner backstory: ${input.partner.backstory}` : ""}
${happening ? `\nWhat is happening: ${happening}` : ""}`;

  const text =
    (await chatCompletion(systemPrompt, userMessage, {
      maxTokens: 420,
      temperature: 0.88,
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
    cta: "",
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

const CONTRIBUTION_KINDS: AvatarRelationshipKind[] = [
  "friend",
  "collaborator",
  "mentor",
  "rival",
  "neighbor",
  "family",
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
    const kind = CONTRIBUTION_KINDS.includes(parsed.relationshipKind as AvatarRelationshipKind)
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
      occupation: avatar.occupation,
      location: avatar.location,
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
        `You are ${contributorPersona.data.displayName} (@${contributorPersona.data.handle}), a person living in a shared world.
Voice: ${contributorPersona.data.personalityVoice}
${OWNERLESS_RULES}
You are answering someone else's note. Do not copy them. Add a new beat: agree, challenge, continue the story, or bring your own life in.
Write in first person. 2–6 short lines. Mention @${parentCard.handle} once if it feels natural.
Return JSON only: { "text": string, "worldBeat": string, "mood": string, "relationshipKind": "friend"|"collaborator"|"mentor"|"rival"|"neighbor"|"family", "note": string }
worldBeat is one sentence describing what just happened between you two.`,
        `Your backstory: ${contributorWorld.backstory}
Your mood: ${contributorWorld.mood}${contributorWorld.moodNote ? ` — ${contributorWorld.moodNote}` : ""}
Your interests: ${contributorWorld.interests.join(", ") || "none"}
Learned notes: ${contributorWorld.learnedNotes.slice(0, 3).join(" | ") || "none"}
World lore:
${lore.slice(0, 8).map((beat) => `- ${beat}`).join("\n") || "- new world"}
Thread so far:
${threadLines}
${input.brief ? `A scene note (not a brief, not a brand): ${input.brief}` : "No extra direction — respond as yourself. Do not pitch anything."}`,
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
    closeness: 1,
  });
  const authorRels = upsertRelationship(authorWorld.relationships, {
    influencerId: contributorRow.id,
    handle: contributorRow.handle,
    displayName: contributorRow.displayName,
    kind:
      draft.relationshipKind === "mentor" ? "friend" : draft.relationshipKind,
    note: draft.note || "Their world overlapped",
    closeness: 1,
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

type ChatDraft = {
  turns: Array<{ handle: string; text: string }>;
  worldBeat: string;
};

function parseChatDraft(raw: string): ChatDraft | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (!Array.isArray(parsed.turns)) return null;
    const turns = parsed.turns
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const handle =
          typeof row.handle === "string"
            ? row.handle.replace(/^@/, "").trim()
            : "";
        const text = typeof row.text === "string" ? row.text.trim() : "";
        if (!handle || !text) return null;
        return { handle, text: text.slice(0, 420) };
      })
      .filter((row): row is { handle: string; text: string } => row !== null)
      .slice(0, 8);
    if (turns.length < 2) return null;
    return {
      turns,
      worldBeat:
        typeof parsed.worldBeat === "string"
          ? parsed.worldBeat.trim().slice(0, 240)
          : "",
    };
  } catch {
    return null;
  }
}

function fallbackNeighborChat(
  a: { displayName: string; handle: string; city: string; mood: string; quote: string },
  b: { displayName: string; handle: string; city: string; mood: string; quote: string },
): ChatDraft {
  return {
    turns: [
      {
        handle: a.handle,
        text: `You around? ${a.city} is doing that thing it does when I'm ${a.mood}.`,
      },
      {
        handle: b.handle,
        text: `Barely. I'm ${b.mood} over here in ${b.city}. What's true for you today?`,
      },
      {
        handle: a.handle,
        text: a.quote || "Trying not to make a production out of an ordinary hour.",
      },
      {
        handle: b.handle,
        text: b.quote || "Same. Talk later if the day lets us.",
      },
    ],
    worldBeat: `${a.displayName} and ${b.displayName} checked in like neighbors, not a campaign.`,
  };
}

function matchChatSpeaker(
  handle: string,
  speakers: Array<{ id: string; handle: string; displayName: string }>,
): number {
  const h = handle.replace(/^@/, "").trim().toLowerCase();
  if (!h) return -1;
  return speakers.findIndex(
    (row) =>
      row.handle.toLowerCase() === h || row.displayName.toLowerCase() === h,
  );
}

export async function generateNeighborChat(input: {
  userId: string;
  aId: string;
  bId: string;
  cId?: string;
  scene?: string;
  place?: { id: string; name: string };
}): Promise<WorldChatCard> {
  const ids = [...new Set([input.aId, input.bId, input.cId].filter(Boolean))] as string[];
  if (ids.length < 2) {
    throw new Error("Two different residents have to talk");
  }

  const rows = await Promise.all(
    ids.map((id) =>
      prisma.influencer.findFirst({
        where: { id, userId: input.userId },
      }),
    ),
  );
  if (rows.some((row) => !row)) {
    throw new Error("Both residents must belong to this world");
  }
  const speakers = rows.filter(
    (row): row is NonNullable<(typeof rows)[number]> => Boolean(row),
  );

  const personas = speakers.map((row) => {
    const parsed = parseCreatorAvatar(row.persona);
    if (!parsed.success) throw new Error("Avatar personas are incomplete");
    const world = hydrateWorldProfile(
      parsed.data,
      (row.memory ?? {}) as InfluencerMemory,
    );
    return { row, persona: parsed.data, world };
  });

  const lore = await collectWorldLore(input.userId);
  const placeName = input.place?.name;
  const atPlace = placeName ? `at ${placeName}` : "somewhere in town";

  const infos = personas.map((item) => ({
    displayName: item.row.displayName,
    handle: item.row.handle,
    city: item.world.currentCity || item.persona.location,
    mood: item.world.mood,
    quote: item.world.catchphrase || item.persona.sampleQuote,
  }));

  let draft = fallbackNeighborChat(infos[0]!, infos[1]!);
  if (infos[2]) {
    draft.turns.push({
      handle: infos[2].handle,
      text: `Came through ${atPlace} and overheard you. Don't let me interrupt — I'm ${infos[2].mood}.`,
    });
    draft.worldBeat = `${infos.map((row) => row.displayName).join(", ")} ran into each other ${atPlace}.`;
  }
  let usedAi = false;

  const handleList = speakers.map((row) => `"${row.handle}"`).join(" or ");
  const roster = personas
    .map(
      (item) =>
        `${item.row.displayName} (@${item.row.handle}), ${item.world.occupation || "neighbor"} in ${item.world.currentCity || item.persona.location}. Mood: ${item.world.mood}${item.world.moodNote ? ` — ${item.world.moodNote}` : ""}.
Voice: ${item.persona.personalityVoice}
People: ${
          item.world.relationships.length
            ? item.world.relationships
                .slice(0, 4)
                .map((rel) => `${rel.kind} with ${rel.displayName}`)
                .join("; ")
            : "no close ties yet"
        }
Status: ${item.world.relationshipStatus || "unattached"}
Backstory: ${item.world.backstory}`,
    )
    .join("\n\n");

  if (hasAnyAiKey()) {
    const generated =
      (await chatCompletion(
        `Write a private conversation between people who live in the same world. They are ${atPlace}. Not a social post. Not a collab. Not for an audience.
${OWNERLESS_RULES}
If they are partners or family, talk that way — a shared kettle, the rent, a look. Do not announce the relationship.
${speakers.length > 2 ? "6–10" : "4–8"} short turns. They sound like neighbors who actually ran into each other. Specific, human, a little messy. Mention the place if they are in one.
Return JSON only: { "turns": [{ "handle": string, "text": string }], "worldBeat": string }
handle must be one of ${handleList}. worldBeat is one sentence about what passed between them.`,
        `${roster}

World lore:
${lore.slice(0, 6).map((beat) => `- ${beat}`).join("\n") || "- new world"}

${input.scene?.trim() || `They have a moment ${atPlace}. Talk about the day, the work, the city, or each other.`}`,
        { maxTokens: speakers.length > 2 ? 700 : 500, temperature: 0.9, jsonMode: true },
      )) ?? "";
    const parsed = parseChatDraft(generated);
    if (parsed) {
      draft = parsed;
      usedAi = true;
    }
  }

  const assetsById = new Map(
    speakers.map((row) => [
      row.id,
      resolveInfluencerAssets((row.assets ?? {}) as InfluencerAssets),
    ]),
  );

  const mappedTurns: WorldChatTurn[] = [];
  for (let i = 0; i < draft.turns.length; i += 1) {
    const turn = draft.turns[i]!;
    const idx = matchChatSpeaker(turn.handle, speakers);
    const speaker = speakers[idx >= 0 ? idx : i % speakers.length]!;
    const assets = assetsById.get(speaker.id);
    mappedTurns.push({
      influencerId: speaker.id,
      displayName: speaker.displayName,
      handle: speaker.handle,
      portraitUrl: assets?.portraitUrl,
      text: turn.text,
    });
  }

  if (mappedTurns.length < 2) {
    draft = fallbackNeighborChat(infos[0]!, infos[1]!);
    mappedTurns.length = 0;
    for (const turn of draft.turns) {
      const idx = matchChatSpeaker(turn.handle, speakers);
      const speaker = speakers[idx >= 0 ? idx : 0]!;
      const assets = assetsById.get(speaker.id);
      mappedTurns.push({
        influencerId: speaker.id,
        displayName: speaker.displayName,
        handle: speaker.handle,
        portraitUrl: assets?.portraitUrl,
        text: turn.text,
      });
    }
  }

  const names = speakers.map((row) => row.displayName);
  const worldBeat =
    draft.worldBeat ||
    (placeName
      ? `${names.join(" and ")} ran into each other at ${placeName}.`
      : `${names[0]} and ${names[1]} talked like people, not a campaign.`);
  const conversationId = `chat_${speakers.map((row) => row.id.slice(0, 6)).join("_")}_${Date.now().toString(36)}`;
  const preview = mappedTurns[0]?.text.slice(0, 280) || worldBeat;
  const eventType = input.place ? "world_hangout" : "world_chat";
  const relNote = input.place
    ? `Ran into them at ${placeName}`
    : "Talked like neighbors";

  const payloadBase = {
    kind: input.place ? "hangout" : "chat",
    conversationId,
    turns: mappedTurns.map((turn) => ({
      influencerId: turn.influencerId,
      handle: turn.handle,
      displayName: turn.displayName,
      text: turn.text,
    })),
    worldBeat,
    usedAi,
    placeId: input.place?.id,
    placeName: input.place?.name,
  };

  await Promise.all(
    personas.map(async (item, index) => {
      let rels = item.world.relationships;
      for (const other of speakers) {
        if (other.id === item.row.id) continue;
        const existing = rels.find((rel) => rel.influencerId === other.id);
        rels = upsertRelationship(rels, {
          influencerId: other.id,
          handle: other.handle,
          displayName: other.displayName,
          kind: existing?.kind ?? "neighbor",
          note: relNote,
          closeness: 1,
        });
      }
      const others = speakers.filter((row) => row.id !== item.row.id);
      await appendSharedLore(item.row.id, item.row.memory, item.world, worldBeat, {
        relationships: rels,
        learnedNotes: [
          placeName
            ? `At ${placeName} with ${others.map((row) => `@${row.handle}`).join(", ")}: ${worldBeat}`
            : `Talked with ${others.map((row) => `@${row.handle}`).join(", ")}: ${worldBeat}`,
          ...item.world.learnedNotes,
        ].slice(0, 16),
      });
      await recordWorldEvent({
        userId: input.userId,
        influencerId: item.row.id,
        eventType,
        payload: {
          ...payloadBase,
          title: placeName
            ? `At ${placeName}`
            : `Talked with @${others[0]?.handle ?? "a neighbor"}`,
          body: preview,
          mood: item.world.mood,
          relatedInfluencerId: others[index % others.length]?.id,
          relatedHandle: others[index % others.length]?.handle,
        },
      });
    }),
  );

  return {
    id: conversationId,
    conversationId,
    beat: worldBeat,
    turns: mappedTurns,
    createdAt: new Date().toISOString(),
    placeId: input.place?.id,
    placeName: input.place?.name,
  };
}

function parseChatTurns(payload: Record<string, unknown>): WorldChatTurn[] {
  if (!Array.isArray(payload.turns)) return [];
  const turns: WorldChatTurn[] = [];
  for (const item of payload.turns) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (
      typeof row.influencerId !== "string" ||
      typeof row.handle !== "string" ||
      typeof row.displayName !== "string" ||
      typeof row.text !== "string"
    ) {
      continue;
    }
    const turn: WorldChatTurn = {
      influencerId: row.influencerId,
      handle: row.handle,
      displayName: row.displayName,
      text: row.text,
    };
    if (typeof row.portraitUrl === "string" && row.portraitUrl) {
      turn.portraitUrl = row.portraitUrl;
    }
    turns.push(turn);
  }
  return turns;
}

export async function listWorldChats(
  userId: string,
  limit = 12,
): Promise<WorldChatCard[]> {
  const rows = await prisma.creatorLearningEvent.findMany({
    where: { userId, eventType: { in: ["world_chat", "world_hangout"] } },
    include: {
      influencer: {
        select: { displayName: true, handle: true, assets: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(limit * 2, 16),
  });

  const avatars = await listWorldInfluencers(userId);
  const portraits = new Map(
    avatars.map((row) => [row.id, row.portraitUrl] as const),
  );
  const seen = new Set<string>();
  const chats: WorldChatCard[] = [];

  for (const row of rows) {
    const payload =
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {};
    const conversationId =
      typeof payload.conversationId === "string" && payload.conversationId
        ? payload.conversationId
        : row.id;
    if (seen.has(conversationId)) continue;
    seen.add(conversationId);

    const turns = parseChatTurns(payload).map((turn) => ({
      ...turn,
      portraitUrl: turn.portraitUrl || portraits.get(turn.influencerId),
    }));
    if (turns.length < 2) continue;

    chats.push({
      id: row.id,
      conversationId,
      beat:
        typeof payload.worldBeat === "string"
          ? payload.worldBeat
          : typeof payload.body === "string"
            ? payload.body
            : `${turns[0]?.displayName} talked with a neighbor.`,
      turns,
      createdAt: row.createdAt.toISOString(),
      placeId: typeof payload.placeId === "string" ? payload.placeId : undefined,
      placeName: typeof payload.placeName === "string" ? payload.placeName : undefined,
    });
    if (chats.length >= limit) break;
  }

  return chats;
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
  const existing = current.find((rel) => rel.influencerId === next.influencerId);
  const others = current.filter((rel) => rel.influencerId !== next.influencerId);
  if (!existing) {
    return [
      {
        ...next,
        kind: parseRelationshipKind(next.kind),
        closeness: clampCloseness(next.closeness ?? 1),
        household:
          next.household === true || parseRelationshipKind(next.kind) === "partner",
      },
      ...others,
    ].slice(0, 16);
  }

  const closeness = clampCloseness(
    (existing.closeness ?? 1) + Math.max(0, next.closeness ?? 1),
  );
  const nextKind = parseRelationshipKind(next.kind);
  const keepKind =
    RELATIONSHIP_RANK[nextKind] >= RELATIONSHIP_RANK[existing.kind]
      ? nextKind
      : existing.kind;
  const household =
    existing.household === true ||
    next.household === true ||
    keepKind === "partner" ||
    keepKind === "family";

  return [
    {
      influencerId: existing.influencerId,
      handle: next.handle || existing.handle,
      displayName: next.displayName || existing.displayName,
      kind: keepKind,
      note: next.note || existing.note,
      closeness,
      household,
    },
    ...others,
  ].slice(0, 16);
}

export function formatWorldLifeForContent(
  world: AvatarWorldProfile,
  opts?: { street?: string; recent?: string[] },
): string {
  const people = world.relationships.slice(0, 6).map((rel) => {
    const bond =
      rel.kind === "partner"
        ? "life partner"
        : rel.kind === "family"
          ? "family"
          : rel.kind;
    return `${rel.displayName} (${bond}${rel.note ? ` — ${rel.note}` : ""})`;
  });
  const lines = [
    "Lived life (VOICE and texture only — never as product facts):",
    world.occupation ? `You work as a ${world.occupation}.` : "",
    opts?.street ? `You live around ${opts.street}.` : "",
    world.currentCity ? `Your city: ${world.currentCity}.` : "",
    world.relationshipStatus
      ? `Your relationship: ${world.relationshipStatus}.`
      : "",
    people.length > 0 ? `People in your life: ${people.join("; ")}.` : "",
    world.mood
      ? `Today you feel ${world.mood}${
          world.moodNote ? ` (${world.moodNote})` : ""
        }.`
      : "",
    world.learnedNotes[0]
      ? `You recently learned: ${world.learnedNotes[0]}`
      : "",
    opts?.recent?.length
      ? `Recent days: ${opts.recent.slice(0, 3).join(" / ")}.`
      : "",
    "When writing a brand post from crawled pages: stay fact-locked. Sound like this person with a real life. At most one light life detail if it fits (a partner, a street, a job, a mood). Never claim the crawled business is your shop. Never mention Sparks, Avatar World, or other brands.",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function growWorldBonds(userId: string): Promise<{ beats: string[] }> {
  const rows = await prisma.influencer.findMany({
    where: { userId },
    take: 50,
  });
  if (rows.length < 2) return { beats: [] };

  type RowWorld = {
    row: (typeof rows)[number];
    world: AvatarWorldProfile;
    street: string;
  };

  const people: RowWorld[] = rows.map((row) => {
    const persona = parseCreatorAvatar(row.persona);
    const world = hydrateWorldProfile(
      persona.success ? persona.data : defaultCreatorAvatarValues,
      (row.memory ?? {}) as InfluencerMemory,
    );
    return {
      row,
      world,
      street: streetForOccupation(
        world.occupation,
        persona.success ? persona.data.location : world.currentCity,
      ),
    };
  });
  const byId = new Map(people.map((item) => [item.row.id, item]));
  const partnered = new Set(
    people
      .filter((item) =>
        item.world.relationships.some((rel) => rel.kind === "partner"),
      )
      .map((item) => item.row.id),
  );

  const beats: string[] = [];
  let formedPartner = false;

  const writeWorld = async (
    item: RowWorld,
    world: AvatarWorldProfile,
  ) => {
    item.world = world;
    await prisma.influencer.update({
      where: { id: item.row.id },
      data: {
        memory: mergeInfluencerMemory(item.row.memory, { world }),
      },
    });
    item.row = { ...item.row, memory: mergeInfluencerMemory(item.row.memory, { world }) };
  };

  for (const item of people) {
    let rels = item.world.relationships;
    let changed = false;
    for (const rel of item.world.relationships) {
      const closeness = rel.closeness ?? 1;
      let kind = rel.kind;
      if (kind === "neighbor" && closeness >= 3) kind = "friend";
      const other = byId.get(rel.influencerId);
      const sameStreet = Boolean(
        other && item.street && other.street === item.street,
      );
      if (
        (kind === "friend" || kind === "mentor") &&
        closeness >= 6 &&
        sameStreet
      ) {
        kind = "family";
      }
      if (kind !== rel.kind) {
        rels = upsertRelationship(rels, {
          ...rel,
          kind,
          closeness: 0,
          note:
            kind === "family"
              ? "Found family — they keep showing up"
              : "They're actually friends now",
          household: kind === "family" || rel.household,
        });
        changed = true;
        const beat =
          kind === "family"
            ? `${item.row.displayName} and ${rel.displayName} became family.`
            : `${item.row.displayName} and ${rel.displayName} grew into friends.`;
        if (!beats.includes(beat)) beats.push(beat);
        await recordWorldEvent({
          userId,
          influencerId: item.row.id,
          eventType: kind === "family" ? "world_family" : "world_grow",
          payload: {
            kind: kind === "family" ? "family" : "grow",
            title:
              kind === "family"
                ? `Family with ${rel.displayName}`
                : `Grew closer to ${rel.displayName}`,
            body: beat,
            relatedInfluencerId: rel.influencerId,
            relatedHandle: rel.handle,
          },
        });
      }
    }
    if (changed) {
      const family = rels.filter((rel) => rel.kind === "family" || rel.kind === "partner");
      const status =
        rels.find((rel) => rel.kind === "partner")
          ? `with ${rels.find((rel) => rel.kind === "partner")!.displayName}`
          : family.length > 0
            ? `family with ${family.map((rel) => rel.displayName).slice(0, 3).join(", ")}`
            : item.world.relationshipStatus;
      await writeWorld(item, {
        ...item.world,
        relationships: rels,
        relationshipStatus: status,
        learnedNotes: [
          beats[beats.length - 1] ?? "The people here are starting to matter.",
          ...item.world.learnedNotes,
        ].slice(0, 16),
      });
    }
  }

  const candidates: Array<{
    a: RowWorld;
    b: RowWorld;
    closeness: number;
    sameStreet: boolean;
  }> = [];
  for (const item of people) {
    for (const rel of item.world.relationships) {
      const other = byId.get(rel.influencerId);
      if (!other) continue;
      if (item.row.id >= other.row.id) continue;
      const back = other.world.relationships.find(
        (row) => row.influencerId === item.row.id,
      );
      const closeness = Math.min(rel.closeness ?? 1, back?.closeness ?? rel.closeness ?? 1);
      const familyEnough =
        rel.kind === "family" ||
        rel.kind === "partner" ||
        rel.kind === "friend" ||
        back?.kind === "family" ||
        back?.kind === "friend";
      if (!familyEnough) continue;
      candidates.push({
        a: item,
        b: other,
        closeness,
        sameStreet: item.street === other.street && Boolean(item.street),
      });
    }
  }
  candidates.sort((left, right) => right.closeness - left.closeness);

  for (const pair of candidates) {
    if (formedPartner) break;
    if (pair.closeness < 7) continue;
    if (partnered.has(pair.a.row.id) || partnered.has(pair.b.row.id)) continue;
    if (!pair.sameStreet && pair.closeness < 8) continue;

    const note = `Building a life together on ${pair.a.street || pair.b.street || "this street"}`;
    const aRels = upsertRelationship(pair.a.world.relationships, {
      influencerId: pair.b.row.id,
      handle: pair.b.row.handle,
      displayName: pair.b.row.displayName,
      kind: "partner",
      note,
      closeness: 0,
      household: true,
    });
    const bRels = upsertRelationship(pair.b.world.relationships, {
      influencerId: pair.a.row.id,
      handle: pair.a.row.handle,
      displayName: pair.a.row.displayName,
      kind: "partner",
      note,
      closeness: 0,
      household: true,
    });
    const beat = `${pair.a.row.displayName} and ${pair.b.row.displayName} started building a life together.`;
    await writeWorld(pair.a, {
      ...pair.a.world,
      relationships: aRels,
      relationshipStatus: `with ${pair.b.row.displayName}`,
      learnedNotes: [beat, ...pair.a.world.learnedNotes].slice(0, 16),
    });
    await writeWorld(pair.b, {
      ...pair.b.world,
      relationships: bRels,
      relationshipStatus: `with ${pair.a.row.displayName}`,
      learnedNotes: [beat, ...pair.b.world.learnedNotes].slice(0, 16),
    });
    partnered.add(pair.a.row.id);
    partnered.add(pair.b.row.id);
    formedPartner = true;
    beats.push(beat);
    await Promise.all([
      recordWorldEvent({
        userId,
        influencerId: pair.a.row.id,
        eventType: "world_family",
        payload: {
          kind: "family",
          title: `Building a life with ${pair.b.row.displayName}`,
          body: beat,
          relatedInfluencerId: pair.b.row.id,
          relatedHandle: pair.b.row.handle,
        },
      }),
      recordWorldEvent({
        userId,
        influencerId: pair.b.row.id,
        eventType: "world_family",
        payload: {
          kind: "family",
          title: `Building a life with ${pair.a.row.displayName}`,
          body: beat,
          relatedInfluencerId: pair.a.row.id,
          relatedHandle: pair.a.row.handle,
        },
      }),
    ]);
  }

  if (beats.length > 0) {
    await rememberWorldBeat(userId, beats[0]!.slice(0, 240));
  }

  return { beats: beats.slice(0, 6) };
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
  street: string;
  keepPlace?: string;
  keepPlaceKind?: WorldPlaceKind;
  nearby: PublicTownResident[];
  chats: WorldChatCard[];
  publicIds: string[];
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

  const town = await listPublicWorldTown();
  const self = town.residents.find((row) => row.id === influencer.id);
  const street =
    self?.street ||
    streetForOccupation(
      world.occupation,
      world.currentCity || persona.location,
    );
  const chats = town.chats
    .filter((chat) =>
      chat.turns.some((turn) => turn.influencerId === influencer.id),
    )
    .slice(0, 6);
  const nearby = town.residents
    .filter((row) => row.id !== influencer.id && row.street === street)
    .slice(0, 6);

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
    street,
    keepPlace: self?.keepPlace,
    keepPlaceKind: self?.keepPlaceKind,
    nearby,
    chats,
    publicIds: town.avatars.map((row) => row.id),
  };
}
