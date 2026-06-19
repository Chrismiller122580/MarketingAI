import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const user = await prisma.user.findUnique({
    where: { id: userId as string },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      plan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
    },
  });

  return NextResponse.json({
    stripeConfigured: isStripeConfigured(),
    stripeCustomerId: user?.stripeCustomerId ?? null,
    stripeSubscriptionId: user?.stripeSubscriptionId ?? null,
    plan: user?.plan ?? "free",
    subscriptionStatus: user?.subscriptionStatus ?? null,
    subscriptionEndsAt: user?.subscriptionEndsAt?.toISOString() ?? null,
  });
}