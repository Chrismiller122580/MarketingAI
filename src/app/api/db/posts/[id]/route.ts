import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { postToSaved } from "@/lib/db-mappers";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { auth } from "@/auth";
import { publishPost as publishToSocial } from "@/lib/social/publishers";
import type { PublishResult } from "@/lib/types";

async function getOwnedPost(id: string, userId: string) {
  return prisma.post.findFirst({ where: { id, userId } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const { id } = await params;
    const existing = await getOwnedPost(id, userId);
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(body.scheduledFor !== undefined && {
          scheduledFor: body.scheduledFor,
          publishStatus: body.scheduledFor ? "scheduled" : "draft",
        }),
        ...(body.publishStatus && { publishStatus: body.publishStatus }),
        ...(body.publishedAt && { publishedAt: new Date(body.publishedAt) }),
        ...(body.publishUrl !== undefined && { publishUrl: body.publishUrl }),
      },
    });

    return NextResponse.json({ post: postToSaved(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const { id } = await params;
    const existing = await getOwnedPost(id, userId);
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const { id } = await params;
    const post = await getOwnedPost(id, userId);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Try to get per-user Twitter token from the current session (if user signed in with X)
    const session = await auth();
    const twitterAccessToken = (session?.user as any)?.twitterAccessToken;

    const result = await publishToSocial({
      ...postToSaved(post),
      twitterAccessToken,
    } as any);

    const updated = await prisma.post.update({
      where: { id },
      data: {
        publishStatus: result.success ? "published" : "failed",
        publishedAt: result.publishedAt
          ? new Date(result.publishedAt)
          : new Date(),
        publishUrl: result.url ?? null,
      },
    });

    return NextResponse.json({ post: postToSaved(updated), result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}