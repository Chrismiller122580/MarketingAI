import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { getCreatorDefaults } from "@/lib/viraforge/learning";
import {
  resolveInfluencerAssets,
  type InfluencerAssets,
} from "@/lib/viraforge/influencer-assets";

export async function GET() {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const rows = await prisma.influencer.findMany({
    where: { userId: authResult },
    orderBy: { updatedAt: "desc" },
    include: { productFacts: true },
    take: 50,
  });

  const influencers = rows;

  const defaults = await getCreatorDefaults(authResult);
  const settings = await prisma.userSettings.findUnique({
    where: { userId: authResult },
    select: { creatorPreferences: true },
  });
  const prefs = (settings?.creatorPreferences ?? {}) as {
    lastInfluencerId?: string;
  };

  return NextResponse.json({
    influencers: influencers.map((row) => ({
      ...row,
      assets: resolveInfluencerAssets((row.assets ?? {}) as InfluencerAssets),
    })),
    defaults,
    lastInfluencerId: prefs.lastInfluencerId,
  });
}