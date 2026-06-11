import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminError, requireAdmin } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (isAdminError(admin)) return admin;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase().trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 500);

  try {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { posts: true, sites: true, packs: true } },
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        subscriptionEndsAt: u.subscriptionEndsAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
