import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { getCreatorDefaults } from "@/lib/viraforge/learning";
import {
  resolveInfluencerAssets,
  type InfluencerAssets,
} from "@/lib/viraforge/influencer-assets";
import {
  listPublicWorldAvatars,
  worldFromMemory,
} from "@/lib/viraforge/avatar-world";

export async function GET() {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const rows = await prisma.influencer.findMany({
    where: { userId: authResult },
    orderBy: { updatedAt: "desc" },
    include: { productFacts: true },
    take: 50,
  });

  const publicWorld = await listPublicWorldAvatars();
  const ownedIds = new Set(rows.map((row) => row.id));

  const defaults = await getCreatorDefaults(authResult);
  const settings = await prisma.userSettings.findUnique({
    where: { userId: authResult },
    select: { creatorPreferences: true },
  });
  const prefs = (settings?.creatorPreferences ?? {}) as {
    lastInfluencerId?: string;
  };

  return NextResponse.json({
    influencers: rows.map((row) => ({
      ...row,
      assets: resolveInfluencerAssets((row.assets ?? {}) as InfluencerAssets),
      owned: true,
      fromWorld: false,
      publicUse: worldFromMemory(row.memory).isPublic,
    })),
    publicAvatars: publicWorld
      .filter((row) => !ownedIds.has(row.id))
      .map((row) => ({
        id: row.id,
        displayName: row.displayName,
        handle: row.handle,
        persona: {
          displayName: row.displayName,
          handle: row.handle,
        },
        assets: {
          portraitUrl: row.portraitUrl,
          videoUrl: row.videoUrl,
        },
        owned: false,
        fromWorld: true,
        publicUse: true,
      })),
    defaults,
    lastInfluencerId: prefs.lastInfluencerId,
  });
}