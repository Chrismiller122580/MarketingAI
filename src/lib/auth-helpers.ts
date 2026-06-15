import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function getSession() {
  return auth();
}

export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireAuthUserId(): Promise<string | NextResponse> {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

export async function requireAdmin(): Promise<
  { userId: string; email: string } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
  };
}

export function isAuthError(
  result: string | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

export function isAdminError<T>(
  result: T | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

export type PlanInfo = {
  plan: string;
  subscriptionStatus: string | null;
  subscriptionEndsAt: Date | null;
};

export async function getUserPlanInfo(userId: string): Promise<PlanInfo | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true, subscriptionEndsAt: true },
  });
  if (!u) return null;
  return {
    plan: u.plan,
    subscriptionStatus: u.subscriptionStatus,
    subscriptionEndsAt: u.subscriptionEndsAt,
  };
}

export function isActivePaidPlan(
  plan?: string | null,
  endsAt?: Date | string | null,
): boolean {
  if (!plan || plan === "free") return false;
  if (!endsAt) return true; // no expiry date = active paid
  const d = endsAt instanceof Date ? endsAt : new Date(endsAt);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

export async function requirePaidUserId(): Promise<string | NextResponse> {
  const userIdOrErr = await requireAuthUserId();
  if (isAuthError(userIdOrErr)) return userIdOrErr;
  const userId = userIdOrErr as string;

  const info = await getUserPlanInfo(userId);
  if (!info || !isActivePaidPlan(info.plan, info.subscriptionEndsAt)) {
    return NextResponse.json(
      {
        error:
          "Active Pro or Enterprise subscription required to crawl sites and generate content.",
        upgradeUrl: "/billing",
        code: "SUBSCRIPTION_REQUIRED",
      },
      { status: 402 },
    );
  }
  return userId;
}