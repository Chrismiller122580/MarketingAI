import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { getCreatorDefaults } from "@/lib/viraforge/learning";
import { repairPortraitUrlIfNeeded } from "@/lib/viraforge/influencer-renders";
import type { InfluencerAssets } from "@/lib/viraforge/influencer-assets";

export async function GET() {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const rows = await prisma.influencer.findMany({
    where: { userId: authResult },
    orderBy: { updatedAt: "desc" },
    include: { productFacts: true },
    take: 50,
  });

  const influencers = await Promise.all(
    rows.map(async (row) => {
      const assets = (row.assets ?? {}) as InfluencerAssets;
      const portraitUrl = await repairPortraitUrlIfNeeded(
        authResult,
        row.id,
        assets.portraitUrl,
      );
      if (!portraitUrl || portraitUrl === assets.portraitUrl) return row;
      return {
        ...row,
        assets: { ...assets, portraitUrl },
      };
    }),
  );

  const defaults = await getCreatorDefaults(authResult);
  const settings = await prisma.userSettings.findUnique({
    where: { userId: authResult },
    select: { creatorPreferences: true },
  });
  const prefs = (settings?.creatorPreferences ?? {}) as {
    lastInfluencerId?: string;
  };

  return NextResponse.json({
    influencers,
    defaults,
    lastInfluencerId: prefs.lastInfluencerId,
  });
}