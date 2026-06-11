import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminError, requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminError(admin)) return admin;

  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, email: true, plan: true },
        },
      },
    });

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        user: p.user,
        plan: p.plan,
        amount: p.amount.toString(),
        currency: p.currency,
        network: p.network,
        txHash: p.txHash,
        reference: p.reference,
        status: p.status,
        confirmedAt: p.confirmedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Admin confirms a crypto payment and upgrades the user
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (isAdminError(admin)) return admin;

  let body: { paymentId?: string; action?: "confirm" | "reject" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { paymentId, action } = body;

  if (!paymentId || !["confirm", "reject"].includes(action || "")) {
    return NextResponse.json({ error: "paymentId and valid action (confirm/reject) required" }, { status: 400 });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (action === "confirm") {
      // Upgrade the user
      const now = new Date();
      const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

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

      return NextResponse.json({ success: true, message: `User upgraded to ${payment.plan}. Subscription active for 30 days.` });
    } else {
      // Reject
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "rejected" },
      });
      return NextResponse.json({ success: true, message: "Payment marked as rejected." });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
