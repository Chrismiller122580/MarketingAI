import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { createPortalSession, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe billing is not configured on the server." },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId as string },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe subscription found. Subscribe with card first." },
      { status: 400 },
    );
  }

  try {
    const url = await createPortalSession(user.stripeCustomerId);
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to open billing portal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}