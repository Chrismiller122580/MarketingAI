import { prisma } from "@/lib/db";
import {
  mergeInfluencerAssets,
  type InfluencerAssets,
} from "./influencer-assets";

export async function patchInfluencerAssets(
  userId: string,
  influencerId: string,
  patch: Partial<InfluencerAssets>,
): Promise<InfluencerAssets | null> {
  const influencer = await prisma.influencer.findFirst({
    where: { id: influencerId, userId },
  });
  if (!influencer) return null;

  const assets = mergeInfluencerAssets(influencer.assets, patch);
  await prisma.influencer.update({
    where: { id: influencerId },
    data: { assets },
  });
  return assets;
}