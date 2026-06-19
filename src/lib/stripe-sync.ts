import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { planFromStripePriceId } from "@/lib/stripe";

export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  const items = subscription.items?.data ?? [];
  const ends = items
    .map((item) => item.current_period_end)
    .filter((v): v is number => typeof v === "number");
  const endTs = ends.length > 0 ? Math.max(...ends) : subscription.billing_cycle_anchor;
  return new Date(endTs * 1000);
}

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): string {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  return status;
}

export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const plan =
    (subscription.metadata?.plan as string) ||
    (priceId ? planFromStripePriceId(priceId) : null) ||
    "pro";

  const status = mapSubscriptionStatus(subscription.status);
  const endsAt = subscriptionPeriodEnd(subscription);

  const isActive = status === "active" || status === "past_due";

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id,
      stripeSubscriptionId: subscription.id,
      plan: isActive ? plan : "free",
      subscriptionStatus: isActive ? status : "canceled",
      subscriptionEndsAt: isActive ? endsAt : new Date(),
    },
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!user) return;
    await downgradeUser(user.id);
    return;
  }
  await downgradeUser(userId);
}

async function downgradeUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "free",
      subscriptionStatus: "canceled",
      subscriptionEndsAt: new Date(),
      stripeSubscriptionId: null,
    },
  });
}

export async function recordStripePayment(
  invoice: Stripe.Invoice,
): Promise<void> {
  if (!invoice.id || invoice.amount_paid === 0) return;

  const existing = await prisma.payment.findUnique({
    where: { stripeInvoiceId: invoice.id },
  });
  if (existing) return;

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!user) return;

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  const line = invoice.lines?.data?.[0];
  const priceRef = line?.pricing?.price_details?.price;
  const priceId =
    typeof priceRef === "string" ? priceRef : priceRef?.id;
  const plan =
    (priceId ? planFromStripePriceId(priceId) : null) || user.plan || "pro";

  await prisma.payment.create({
    data: {
      userId: user.id,
      provider: "stripe",
      plan,
      amount: invoice.amount_paid / 100,
      currency: (invoice.currency || "usd").toUpperCase(),
      network: "stripe",
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscriptionId ?? undefined,
      status: "confirmed",
      confirmedAt: new Date(),
    },
  });
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId ?? undefined,
    },
  });
}