import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminError, requireAdmin } from "@/lib/auth-helpers";
import { postToSaved } from "@/lib/db-mappers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isAdminError(admin)) return admin;

  const { id: userId } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [posts, sites] = await Promise.all([
      prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.site.findMany({
        where: { userId },
        orderBy: { crawledAt: "desc" },
        select: { id: true, domain: true, crawledAt: true, pages: true }, // pages is json array
      }),
    ]);

    const sitesSummary = sites.map((s) => ({
      id: s.id,
      domain: s.domain,
      crawledAt: s.crawledAt.toISOString(),
      pageCount: Array.isArray(s.pages) ? s.pages.length : 0,
    }));

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      posts: posts.map(postToSaved),
      sites: sitesSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Admin can delete any post belonging to the user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isAdminError(admin)) return admin;

  const { id: userId } = await params;

  // Support both body { postId } or query param for flexibility
  let postId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    postId = body?.postId ?? null;
  } catch {}
  if (!postId) {
    const { searchParams } = new URL(request.url);
    postId = searchParams.get("postId");
  }

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  try {
    const existing = await prisma.post.findFirst({
      where: { id: postId, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Post not found for this user" }, { status: 404 });
    }

    await prisma.post.delete({ where: { id: postId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
