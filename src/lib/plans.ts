export const PLAN_IDS = [
  "free",
  "pro",
  "enterprise",
  "enterprise_plus",
] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const ENTERPRISE_PLUS_LABEL = "Enterprise Plus";

export function isEnterprisePlusPlan(plan?: string | null): boolean {
  return plan === "enterprise_plus";
}

export function planDisplayName(plan?: string | null): string {
  if (plan === "enterprise_plus") return ENTERPRISE_PLUS_LABEL;
  if (plan === "enterprise") return "Enterprise";
  if (plan === "pro") return "Pro";
  return "Free";
}