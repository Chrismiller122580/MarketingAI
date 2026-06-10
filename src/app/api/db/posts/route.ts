import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { postFromGenerated, postToSaved } from "@/lib/db-mappers";
import type { GeneratedPost, SavedPost } from "@/lib/types";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      posts: posts.map(postToSaved),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const post = body.post as GeneratedPost | SavedPost;
    const siteDomain = body.siteDomain as string | undefined;

    if (!post?.text || !post.platform) {
      return NextResponse.json({ error: "Invalid post" }, { status: 400 });
    }

    let siteId: string | undefined;
    if (siteDomain) {
      const site = await prisma.site.findUnique({
        where: { domain: siteDomain },
      });
      siteId = site?.id;
    }

    const data = postFromGenerated(post, siteId);
    const saved = await prisma.post.create({ data });

    return NextResponse.json({ post: postToSaved(saved) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.post.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}