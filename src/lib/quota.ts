import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeDomain } from "@/lib/crawl";
import { isActivePaidPlan } from "@/lib/auth-helpers";

export const FREE_QUOTA = {
  sites: 1,
  generationsPerMonth: 15,
} as const;

export type QuotaSnapshot = {
  plan: string;
  paid: boolean;
  sitesUsed: number;
  sitesLimit: number | null;
  generationsUsed: number;
  generationsLimit: number | null;
  period: string;
};

type StoredUsage = {
  period?: string;
  generations?: number;
};

export function currentUsagePeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function quotaExceededResponse(
  message: string,
  usage?: QuotaSnapshot,
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: "QUOTA_EXCEEDED",
      upgradeUrl: "/billing",
      usage,
    },
    { status: 402 },
  );
}

export async function userHasPaidAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      plan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
    },
  });
  if (!user) return false;
  if (user.role === "admin") return true;
  return isActivePaidPlan(user.plan, user.subscriptionEndsAt);
}

export async function getQuotaSnapshot(userId: string): Promise<QuotaSnapshot> {
  const [user, siteCount, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, role: true, subscriptionEndsAt: true },
    }),
    prisma.site.count({ where: { userId } }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { usage: true },
    }),
  ]);

  const paid =
    user?.role === "admin" ||
    isActivePaidPlan(user?.plan, user?.subscriptionEndsAt);
  const period = currentUsagePeriod();
  const stored = (settings?.usage ?? {}) as StoredUsage;
  const generationsUsed =
    stored.period === period ? Math.max(0, stored.generations ?? 0) : 0;

  return {
    plan: user?.plan ?? "free",
    paid,
    sitesUsed: siteCount,
    sitesLimit: paid ? null : FREE_QUOTA.sites,
    generationsUsed,
    generationsLimit: paid ? null : FREE_QUOTA.generationsPerMonth,
    period,
  };
}

export async function assertFreeCrawlAllowed(
  userId: string,
  domain: string,
): Promise<NextResponse | null> {
  if (await userHasPaidAccess(userId)) return null;

  let lookup = domain.trim();
  try {
    lookup = normalizeDomain(lookup);
  } catch {
    /* use raw */
  }

  const existing = await prisma.site.findFirst({
    where: { userId, OR: [{ domain: lookup }, { domain }] },
    select: { id: true },
  });
  if (existing) return null;

  const count = await prisma.site.count({ where: { userId } });
  if (count >= FREE_QUOTA.sites) {
    const usage = await getQuotaSnapshot(userId);
    return quotaExceededResponse(
      `Free includes ${FREE_QUOTA.sites} website. Recrawl your existing site anytime, or upgrade to Pro for unlimited sites.`,
      usage,
    );
  }
  return null;
}

export async function assertFreeGenerationsAllowed(
  userId: string,
  count = 1,
): Promise<NextResponse | null> {
  if (count < 1) return null;
  if (await userHasPaidAccess(userId)) return null;

  const usage = await getQuotaSnapshot(userId);
  const used = usage.generationsUsed;
  const limit = FREE_QUOTA.generationsPerMonth;
  if (used >= limit) {
    return quotaExceededResponse(
      `Free includes ${limit} posts this month (${usage.period}). You've used them all. Upgrade to Pro for unlimited generations.`,
      usage,
    );
  }
  if (used + count > limit) {
    return quotaExceededResponse(
      `Free has ${limit - used} generation${limit - used === 1 ? "" : "s"} left this month. Lower the pack size or upgrade to Pro.`,
      usage,
    );
  }
  return null;
}

export async function consumeGenerations(
  userId: string,
  count = 1,
): Promise<void> {
  if (count < 1) return;
  if (await userHasPaidAccess(userId)) return;

  const period = currentUsagePeriod();
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { usage: true },
  });
  const stored = (settings?.usage ?? {}) as StoredUsage;
  const prior = stored.period === period ? Math.max(0, stored.generations ?? 0) : 0;
  const usage = { period, generations: prior + count } satisfies StoredUsage;

  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      brandVoice:
        "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
      targetAudience: "Business professionals and decision-makers",
      defaultPlatforms: ["instagram", "linkedin", "twitter"],
      includeHashtags: true,
      emojiStyle: "light",
      preferAiImages: false,
      usage: usage as Prisma.InputJsonValue,
    },
    update: { usage: usage as Prisma.InputJsonValue },
  });
}

export function remainingFreeGenerations(usage: QuotaSnapshot): number {
  if (usage.paid || usage.generationsLimit == null) return Number.POSITIVE_INFINITY;
  return Math.max(0, usage.generationsLimit - usage.generationsUsed);
}
