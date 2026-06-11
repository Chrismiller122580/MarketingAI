import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminError, requireAdmin } from "@/lib/auth-helpers";

const VALID_ROLES = ["user", "admin"] as const;
const VALID_PLANS = ["free", "pro", "enterprise"] as const;
const VALID_STATUSES = ["active", "trialing", "past_due", "canceled", ""] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isAdminError(admin)) return admin;

  const { id } = await params;

  if (id === admin.userId) {
    // Allow plan/status changes on self, but not role demotion
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    body = (parsed ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, string | Date | null> = {};

  if (body.role !== undefined) {
    const roleRaw = typeof body.role === "string" ? body.role : "";
    const role = roleRaw.trim();
    if (!role || !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json({ error: "Role must be 'user' or 'admin'" }, { status: 400 });
    }
    if (id === admin.userId && role !== "admin") {
      return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 });
    }
    data.role = role;
  }

  if (body.plan !== undefined) {
    const planRaw = typeof body.plan === "string" ? body.plan : "";
    const plan = planRaw.trim();
    if (!plan || !VALID_PLANS.includes(plan as (typeof VALID_PLANS)[number])) {
      return NextResponse.json({ error: "Plan must be 'free', 'pro' or 'enterprise'" }, { status: 400 });
    }
    data.plan = plan;
  }

  if (body.subscriptionStatus !== undefined) {
    const statusRaw = typeof body.subscriptionStatus === "string" ? body.subscriptionStatus : "";
    const status = statusRaw.trim();
    if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json(
        { error: "Invalid subscriptionStatus" },
        { status: 400 },
      );
    }
    data.subscriptionStatus = status || null;
  }

  if (body.subscriptionEndsAt !== undefined) {
    const endsRaw = body.subscriptionEndsAt;
    if (endsRaw) {
      const d = new Date(String(endsRaw));
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid subscriptionEndsAt date" }, { status: 400 });
      }
      data.subscriptionEndsAt = d;
    } else {
      data.subscriptionEndsAt = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extra guard for demoting last admin (if role change included)
    if (data.role === "user" && existing.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 400 });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        createdAt: true,
        _count: { select: { posts: true, sites: true, packs: true } },
      },
    });

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
