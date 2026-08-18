import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  listWorldFeed,
  listWorldInfluencers,
  postToWorldCard,
  type WorldPostCard,
} from "@/lib/viraforge/avatar-world";

export async function GET() {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const [avatars, feed, postRows] = await Promise.all([
    listWorldInfluencers(authResult),
    listWorldFeed(authResult, 40),
    prisma.post.findMany({
      where: { userId: authResult, influencerId: { not: null } },
      include: {
        influencer: {
          select: { displayName: true, handle: true, assets: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const posts = postRows
    .map((row) => postToWorldCard(row))
    .filter((row): row is WorldPostCard => row !== null);

  return NextResponse.json({ avatars, feed, posts });
}
