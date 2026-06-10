import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { postToSaved } from "@/lib/db-mappers";
import type { PublishResult } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
  try {
    const { id } = await params;
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
  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const publishResponse = await fetch(
      new URL("/api/publish", request.url).toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: postToSaved(post) }),
      },
    );

    const result = (await publishResponse.json()) as PublishResult;

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