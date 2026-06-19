import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { PRICING, type PlanKey } from "@/lib/billing";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe billing is not configured on the server." },
      { status: 503 },
    );
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = (body.plan || "").toLowerCase() as PlanKey;
  if (!PRICING[plan]) {
    return NextResponse.json(
      { error: "Invalid plan. Choose pro or enterprise." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId as string },
    select: { email: true },
  });

  if (!user?.email) {
    return NextResponse.json({ error: "User email not found" }, { status: 400 });
  }

  try {
    const url = await createCheckoutSession({
      userId: userId as string,
      email: user.email,
      plan,
    });
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}