import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const payments = await prisma.payment.findMany({
      where: { userId: userId as string },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      payments: payments.map((p) => ({
        ...p,
        amount: p.amount.toString(),
        createdAt: p.createdAt.toISOString(),
        confirmedAt: p.confirmedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
