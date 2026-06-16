import { prisma } from "@/lib/db";

const SUBSCRIPTION_DAYS = 30;

export async function confirmPaymentAndUpgrade(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return { ok: false as const, error: "Payment not found" };
  }

  if (payment.status === "confirmed") {
    return { ok: false as const, error: "Payment already confirmed" };
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: payment.userId },
      data: {
        plan: payment.plan,
        subscriptionStatus: "active",
        subscriptionEndsAt: endsAt,
      },
    }),
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "confirmed",
        confirmedAt: now,
      },
    }),
  ]);

  return {
    ok: true as const,
    plan: payment.plan,
    endsAt,
  };
}