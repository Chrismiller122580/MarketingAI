import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await context.params;

    const influencer = await prisma.influencer.findFirst({
      where: { id, userId: authResult },
      select: { id: true, productFactsId: true, displayName: true },
    });

    if (!influencer) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const productFactsId = influencer.productFactsId;

    await prisma.influencer.delete({ where: { id } });

    if (productFactsId) {
      const stillLinked = await prisma.influencer.count({
        where: { productFactsId },
      });
      if (stillLinked === 0) {
        await prisma.productFacts.delete({ where: { id: productFactsId } });
      }
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: authResult },
      select: { creatorPreferences: true },
    });
    const prefs = (settings?.creatorPreferences ?? {}) as {
      lastInfluencerId?: string;
    };

    if (prefs.lastInfluencerId === id) {
      const { lastInfluencerId: _removed, ...rest } = prefs;
      await prisma.userSettings.update({
        where: { userId: authResult },
        data: { creatorPreferences: rest },
      });
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      displayName: influencer.displayName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete avatar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}