import { prisma } from "@/lib/db";
import { creatorAvatarSchema } from "@/lib/schemas/creator-avatar-schema";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";
import type {
  InfluencerGenerateContext,
  SiteData,
  SitePage,
} from "@/lib/types";
import { buildPersonalizationContext } from "./learning";
import { mergeInfluencerAssets } from "./influencer-assets";
import { buildFactPinpoints, mergeFactsWithSite } from "./site-facts-extractor";

export async function loadInfluencerGenerateContext(
  userId: string,
  influencerId: string,
  site: SiteData,
  page: SitePage,
): Promise<InfluencerGenerateContext | null> {
  const influencer = await prisma.influencer.findFirst({
    where: { id: influencerId, userId },
    include: { productFacts: true },
  });

  if (!influencer?.productFacts) return null;

  const persona = creatorAvatarSchema.safeParse(influencer.persona);
  if (!persona.success) return null;

  const locked = productFactsSchema.parse({
    name: influencer.productFacts.name,
    price: influencer.productFacts.price,
    features: influencer.productFacts.features,
    location: influencer.productFacts.location ?? undefined,
    hours: influencer.productFacts.hours ?? undefined,
    ingredients: influencer.productFacts.ingredients,
  });

  const mergedFacts = mergeFactsWithSite(locked, site, page);
  const pinpoints = buildFactPinpoints(locked, site, page);
  const assets = mergeInfluencerAssets(influencer.assets, {});
  const personalization = await buildPersonalizationContext(
    userId,
    influencerId,
  );

  return {
    id: influencer.id,
    persona: persona.data,
    facts: mergedFacts,
    pinpoints,
    assets,
    displayName: persona.data.displayName,
    handle: persona.data.handle,
    personalization: personalization || undefined,
  };
}