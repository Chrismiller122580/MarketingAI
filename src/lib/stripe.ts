import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import type { PlanKey } from "@/lib/billing";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_PRO &&
    process.env.STRIPE_PRICE_ENTERPRISE
  );
}

export function getStripePriceId(plan: PlanKey): string {
  const priceId =
    plan === "pro"
      ? process.env.STRIPE_PRICE_PRO
      : plan === "enterprise_plus"
        ? process.env.STRIPE_PRICE_ENTERPRISE_PLUS
        : process.env.STRIPE_PRICE_ENTERPRISE;
  if (!priceId) {
    throw new Error(`Stripe price ID not configured for plan: ${plan}`);
  }
  return priceId;
}

export function planFromStripePriceId(priceId: string): PlanKey | null {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "enterprise";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_PLUS) {
    return "enterprise_plus";
  }
  return null;
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true },
  });

  if (user?.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email || user?.email || undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession(opts: {
  userId: string;
  email: string;
  plan: PlanKey;
}): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(opts.userId, opts.email);
  const origin = getAppOrigin();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: getStripePriceId(opts.plan), quantity: 1 }],
    success_url: `${origin}/billing?stripe=success`,
    cancel_url: `${origin}/billing?stripe=cancelled`,
    metadata: {
      userId: opts.userId,
      plan: opts.plan,
    },
    subscription_data: {
      metadata: {
        userId: opts.userId,
        plan: opts.plan,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}

export async function createPortalSession(customerId: string): Promise<string> {
  const stripe = getStripe();
  const origin = getAppOrigin();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/billing`,
  });

  return session.url;
}