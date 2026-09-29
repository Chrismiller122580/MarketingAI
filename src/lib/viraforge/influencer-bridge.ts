import {
  defaultCreatorAvatarValues,
  parseCreatorAvatar,
} from "@/lib/schemas/creator-avatar-schema";
import { factsFromRecord } from "@/lib/schemas/product-facts-schema";
import type {
  InfluencerGenerateContext,
  SiteData,
  SitePage,
} from "@/lib/types";
import {
  findUsableInfluencer,
  formatWorldLifeForContent,
  hydrateWorldProfile,
  listInfluencerWorldEvents,
  listWorldInfluencers,
} from "./avatar-world";
import { buildPersonalizationContext, type InfluencerMemory } from "./learning";
import { mergeInfluencerAssets, resolveInfluencerAssets } from "./influencer-assets";
import {
  buildFactPinpointsFromSites,
  mergeFactsWithSites,
} from "./site-facts-extractor";
import { streetForOccupation } from "./world-economy";

/** Avatars that already have a created face. Campaigns use these instead of cartoon art. */
export type CampaignCastMember = {
  id: string;
  displayName: string;
  relationshipIds: string[];
  location: string;
};

export async function listCampaignCast(
  userId: string,
): Promise<CampaignCastMember[]> {
  const cards = await listWorldInfluencers(userId);
  return cards
    .filter((card) => Boolean(card.portraitUrl))
    .map((card) => ({
      id: card.id,
      displayName: card.displayName,
      relationshipIds: card.relationshipIds,
      location: card.location,
    }));
}

export async function listCampaignAvatarIds(userId: string): Promise<string[]> {
  const cast = await listCampaignCast(userId);
  return cast.map((card) => card.id);
}

export async function loadInfluencerGenerateContext(
  userId: string,
  influencerId: string,
  site: SiteData,
  page: SitePage,
  allSites?: SiteData[],
): Promise<InfluencerGenerateContext | null> {
  const usable = await findUsableInfluencer(userId, influencerId);
  if (!usable) return null;

  const influencer = usable.influencer;
  const persona = parseCreatorAvatar(influencer.persona);
  if (!persona.success) return null;

  const locked = factsFromRecord(influencer.productFacts);
  const sites =
    allSites && allSites.length > 0
      ? allSites
      : [site];

  const mergedFacts = mergeFactsWithSites(locked, sites, page);
  const pinpoints = buildFactPinpointsFromSites(locked, sites, page);
  const assets = resolveInfluencerAssets(
    mergeInfluencerAssets(influencer.assets, {}),
  );
  const personalization = await buildPersonalizationContext(
    userId,
    usable.owned ? influencerId : undefined,
  );

  const world = hydrateWorldProfile(
    persona.success ? persona.data : defaultCreatorAvatarValues,
    (influencer.memory ?? {}) as InfluencerMemory,
  );
  const street = streetForOccupation(
    world.occupation,
    persona.data.location || world.currentCity,
  );
  const events = await listInfluencerWorldEvents(
    influencer.userId,
    influencer.id,
    8,
  );
  const worldLife = formatWorldLifeForContent(world, {
    street,
    recent: events.map((event) => event.title),
  });

  return {
    id: influencer.id,
    persona: persona.data,
    facts: mergedFacts,
    pinpoints,
    assets,
    displayName: persona.data.displayName,
    handle: persona.data.handle,
    personalization: personalization || undefined,
    worldLife,
    language: world.language,
  };
}
