import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { getCreatorDefaults } from "@/lib/viraforge/learning";

export async function GET() {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const influencers = await prisma.influencer.findMany({
    where: { userId: authResult },
    orderBy: { updatedAt: "desc" },
    include: { productFacts: true },
    take: 50,
  });

  const defaults = await getCreatorDefaults(authResult);

  return NextResponse.json({ influencers, defaults });
}