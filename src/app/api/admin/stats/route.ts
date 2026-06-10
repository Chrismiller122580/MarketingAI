import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminError, requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminError(admin)) return admin;

  try {
    const [users, posts, sites, packs, published] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.site.count(),
      prisma.campaignPack.count(),
      prisma.post.count({ where: { publishStatus: "published" } }),
    ]);

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { posts: true, sites: true } },
      },
    });

    return NextResponse.json({
      totals: { users, posts, sites, packs, published },
      recentUsers: recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}