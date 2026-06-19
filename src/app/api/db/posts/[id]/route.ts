import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { postToSaved } from "@/lib/db-mappers";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { auth } from "@/auth";
import { recordVariantPick } from "@/lib/learning-preferences";
import { publishPostRecord } from "@/lib/publish-post";
import type { AiProvider, AiVariant } from "@/lib/types";

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

    if (body.selectedProvider && body.text) {
      await recordVariantPick(
        userId,
        body.selectedProvider as AiProvider,
        body.text as string,
        body.aiVariants as AiVariant[] | undefined,
      );
    }

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
        ...(body.image !== undefined && { image: body.image }),
        ...(body.text !== undefined && {
          text: body.text,
          characterCount: String(body.text).length,
        }),
        ...(body.selectedProvider !== undefined && {
          selectedProvider: body.selectedProvider,
        }),
        ...(body.aiVariants !== undefined && { aiVariants: body.aiVariants }),
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
  _request: Request,
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

    const session = await auth();
    const twitterAccessToken = (session?.user as Record<string, unknown>)
      ?.twitterAccessToken as string | undefined;

    const outcome = await publishPostRecord(id, twitterAccessToken);
    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 404 });
    }

    return NextResponse.json({
      post: outcome.post,
      result: outcome.result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}