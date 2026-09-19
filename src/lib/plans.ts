export const PLAN_IDS = [
  "free",
  "pro",
  "enterprise",
  "enterprise_plus",
] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const ENTERPRISE_PLUS_LABEL = "Enterprise Plus";

/** Platforms a free beginner can connect for their one website. */
export const FREE_SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "email",
] as const;

export function isFreeSocialPlatform(platform: string): boolean {
  return (FREE_SOCIAL_PLATFORMS as readonly string[]).includes(platform);
}

export function isEnterprisePlusPlan(plan?: string | null): boolean {
  return plan === "enterprise_plus";
}

export function planDisplayName(plan?: string | null): string {
  if (plan === "enterprise_plus") return ENTERPRISE_PLUS_LABEL;
  if (plan === "enterprise") return "Enterprise";
  if (plan === "pro") return "Pro";
  return "Free";
}

/** Client-safe paid check. Admin always counts as paid. */
export function sessionIsPaid(user?: {
  plan?: string | null;
  role?: string | null;
  subscriptionEndsAt?: Date | string | null;
} | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!user.plan || user.plan === "free") return false;
  if (!user.subscriptionEndsAt) return true;
  const d =
    user.subscriptionEndsAt instanceof Date
      ? user.subscriptionEndsAt
      : new Date(user.subscriptionEndsAt);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

/** Published posts needed on a paid plan to unlock Creator tools without Plus. */
export const CREATOR_PUBLISHED_UNLOCK = 3;

/**
 * Creator Studio + Avatar World: Enterprise Plus and admins always.
 * Paid plans unlock after a few published posts so power users aren't walled off.
 * Free stays on the marketing engine.
 */
export function canUseCreatorTools(
  user?: {
    plan?: string | null;
    role?: string | null;
    subscriptionEndsAt?: Date | string | null;
  } | null,
  extras?: { publishedCount?: number },
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!sessionIsPaid(user)) return false;
  if (isEnterprisePlusPlan(user.plan)) return true;
  return (extras?.publishedCount ?? 0) >= CREATOR_PUBLISHED_UNLOCK;
}
