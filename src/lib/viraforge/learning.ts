import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";

export type CreatorEventType =
  | "field_edit"
  | "save"
  | "generate"
  | "regenerate"
  | "approve_quote"
  | "reject_quote";

export type InfluencerMemory = {
  styleAdjustments?: Record<string, string | number>;
  voiceHints?: string[];
  approvedPhrases?: string[];
  rejectedPhrases?: string[];
  generationCount?: number;
  lastFields?: Partial<CreatorAvatarForm>;
};

export type CreatorPreferences = {
  preferredLocations?: string[];
  preferredReligions?: string[];
  preferredSocialClasses?: string[];
  avgBodyType?: number;
  defaultPlatforms?: string[];
  lastInfluencerId?: string;
};

const MAX_HINTS = 8;
const MAX_PHRASES = 5;

export async function recordCreatorEvent(
  userId: string,
  eventType: CreatorEventType,
  payload: Record<string, unknown>,
  influencerId?: string,
): Promise<void> {
  await prisma.creatorLearningEvent.create({
    data: {
      userId,
      influencerId,
      eventType,
      payload: payload as Prisma.InputJsonValue,
    },
  });

  if (eventType === "field_edit" && payload.field && payload.value !== undefined) {
    await updateCreatorPreferencesFromField(
      userId,
      String(payload.field),
      payload.value,
    );
  }

  if (
    (eventType === "approve_quote" || eventType === "reject_quote") &&
    influencerId &&
    typeof payload.quote === "string"
  ) {
    await updateInfluencerMemoryPhrase(
      influencerId,
      payload.quote,
      eventType === "approve_quote",
    );
  }

  if ((eventType === "generate" || eventType === "regenerate") && influencerId) {
    await incrementGenerationCount(influencerId);
  }
}

async function updateCreatorPreferencesFromField(
  userId: string,
  field: string,
  value: unknown,
): Promise<void> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const prefs = (settings?.creatorPreferences ?? {}) as CreatorPreferences;

  if (field === "location" && typeof value === "string") {
    const locs = [...(prefs.preferredLocations ?? [])];
    if (!locs.includes(value)) locs.unshift(value);
    prefs.preferredLocations = locs.slice(0, MAX_HINTS);
  }
  if (field === "religion" && typeof value === "string") {
    const items = [...(prefs.preferredReligions ?? [])];
    if (!items.includes(value)) items.unshift(value);
    prefs.preferredReligions = items.slice(0, MAX_HINTS);
  }
  if (field === "socialClass" && typeof value === "string") {
    const items = [...(prefs.preferredSocialClasses ?? [])];
    if (!items.includes(value)) items.unshift(value);
    prefs.preferredSocialClasses = items.slice(0, MAX_HINTS);
  }
  if (field === "bodyType" && typeof value === "number") {
    const prev = prefs.avgBodyType ?? value;
    prefs.avgBodyType = Math.round((prev + value) / 2);
  }

  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      brandVoice:
        "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
      targetAudience: "Business professionals and decision-makers",
      defaultPlatforms: ["instagram", "linkedin", "twitter"],
      includeHashtags: true,
      emojiStyle: "light",
      preferAiImages: false,
      creatorPreferences: prefs,
    },
    update: { creatorPreferences: prefs },
  });
}

async function updateInfluencerMemoryPhrase(
  influencerId: string,
  quote: string,
  approved: boolean,
): Promise<void> {
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
  });
  if (!influencer) return;

  const memory = (influencer.memory ?? {}) as InfluencerMemory;
  if (approved) {
    const phrases = [...(memory.approvedPhrases ?? [])];
    if (!phrases.includes(quote)) phrases.unshift(quote);
    memory.approvedPhrases = phrases.slice(0, MAX_PHRASES);
  } else {
    const phrases = [...(memory.rejectedPhrases ?? [])];
    if (!phrases.includes(quote)) phrases.unshift(quote);
    memory.rejectedPhrases = phrases.slice(0, MAX_PHRASES);
  }

  await prisma.influencer.update({
    where: { id: influencerId },
    data: { memory },
  });
}

async function incrementGenerationCount(influencerId: string): Promise<void> {
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
  });
  if (!influencer) return;

  const memory = (influencer.memory ?? {}) as InfluencerMemory;
  memory.generationCount = (memory.generationCount ?? 0) + 1;

  await prisma.influencer.update({
    where: { id: influencerId },
    data: { memory },
  });
}

export async function buildPersonalizationContext(
  userId: string,
  influencerId?: string,
): Promise<string> {
  const hints: string[] = [];

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const prefs = (settings?.creatorPreferences ?? {}) as CreatorPreferences;

  if (prefs.preferredLocations?.length) {
    hints.push(`User often targets: ${prefs.preferredLocations.slice(0, 3).join(", ")}`);
  }
  if (prefs.avgBodyType !== undefined) {
    hints.push(`Preferred body type slider around ${prefs.avgBodyType}`);
  }
  if (prefs.preferredReligions?.length) {
    hints.push(`Common religion context: ${prefs.preferredReligions[0]}`);
  }

  if (influencerId) {
    const influencer = await prisma.influencer.findFirst({
      where: { id: influencerId, userId },
    });
    if (influencer) {
      const memory = (influencer.memory ?? {}) as InfluencerMemory;
      if (memory.approvedPhrases?.length) {
        hints.push(
          `Approved quote tone examples: ${memory.approvedPhrases.slice(0, 2).join(" | ")}`,
        );
      }
      if (memory.rejectedPhrases?.length) {
        hints.push(`Avoid phrasing like: ${memory.rejectedPhrases[0]}`);
      }
      if (memory.voiceHints?.length) {
        hints.push(...memory.voiceHints.slice(0, 2));
      }
    }
  }

  return hints.length
    ? `Personalization (learned from user): ${hints.join(". ")}.`
    : "";
}

export async function getCreatorDefaults(
  userId: string,
): Promise<Partial<CreatorAvatarForm>> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const prefs = (settings?.creatorPreferences ?? {}) as CreatorPreferences;
  const defaults: Partial<CreatorAvatarForm> = {};

  if (prefs.preferredLocations?.[0]) {
    defaults.location = prefs.preferredLocations[0];
  }
  if (prefs.preferredReligions?.[0]) {
    defaults.religion = prefs.preferredReligions[0];
  }
  if (prefs.preferredSocialClasses?.[0]) {
    defaults.socialClass = prefs.preferredSocialClasses[0];
  }
  if (prefs.avgBodyType !== undefined) {
    defaults.bodyType = prefs.avgBodyType;
  }

  if (prefs.lastInfluencerId) {
    const last = await prisma.influencer.findFirst({
      where: { id: prefs.lastInfluencerId, userId },
    });
    if (last?.persona) {
      return { ...(last.persona as CreatorAvatarForm), ...defaults };
    }
  }

  return defaults;
}

export async function upsertInfluencerWithFacts(
  userId: string,
  persona: CreatorAvatarForm,
  productFacts: ProductFactsForm,
  assets?: { portraitUrl?: string },
): Promise<{ influencerId: string; productFactsId: string }> {
  const existing = await prisma.influencer.findUnique({
    where: { userId_handle: { userId, handle: persona.handle } },
  });

  let factsId: string;

  if (existing?.productFactsId) {
    await prisma.productFacts.update({
      where: { id: existing.productFactsId },
      data: {
        name: productFacts.name,
        price: productFacts.price,
        features: productFacts.features,
        location: productFacts.location,
        hours: productFacts.hours,
        ingredients: productFacts.ingredients ?? [],
      },
    });
    factsId = existing.productFactsId;
  } else {
    const facts = await prisma.productFacts.create({
      data: {
        userId,
        name: productFacts.name,
        price: productFacts.price,
        features: productFacts.features,
        location: productFacts.location,
        hours: productFacts.hours,
        ingredients: productFacts.ingredients ?? [],
      },
    });
    factsId = facts.id;
  }

  const priorAssets = (existing?.assets ?? {}) as Record<string, unknown>;
  const mergedAssets = { ...priorAssets, ...assets };

  const influencer = await prisma.influencer.upsert({
    where: {
      userId_handle: { userId, handle: persona.handle },
    },
    create: {
      userId,
      displayName: persona.displayName,
      handle: persona.handle,
      persona,
      productFactsId: factsId,
      assets: mergedAssets,
      memory: { lastFields: persona },
    },
    update: {
      displayName: persona.displayName,
      persona,
      productFactsId: factsId,
      assets: mergedAssets,
      memory: { lastFields: persona },
    },
  });

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const prefs = (settings?.creatorPreferences ?? {}) as CreatorPreferences;
  prefs.lastInfluencerId = influencer.id;

  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      brandVoice:
        "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
      targetAudience: "Business professionals and decision-makers",
      defaultPlatforms: ["instagram", "linkedin", "twitter"],
      includeHashtags: true,
      emojiStyle: "light",
      preferAiImages: false,
      creatorPreferences: prefs,
    },
    update: { creatorPreferences: prefs },
  });

  return { influencerId: influencer.id, productFactsId: factsId };
}