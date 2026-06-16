import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { isValidXrpTxHash, isXrpNetwork } from "@/lib/billing";
import { verifyCryptoPayment } from "@/lib/crypto-verify";
import { confirmPaymentAndUpgrade } from "@/lib/confirm-payment";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  let body: { reference?: string; txHash?: string; network?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reference, txHash, network } = body;

  if (!reference || !txHash) {
    return NextResponse.json({ error: "reference and txHash are required" }, { status: 400 });
  }

  const cleanTx = txHash.trim();
  const networkName = network || "xrp";

  if (isXrpNetwork(networkName) && !isValidXrpTxHash(cleanTx)) {
    return NextResponse.json(
      { error: "Invalid XRPL transaction hash (expected 64 hex characters)" },
      { status: 400 },
    );
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found for this reference" }, { status: 404 });
    }

    if (payment.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (payment.status === "confirmed") {
      return NextResponse.json({ error: "This payment has already been confirmed" }, { status: 400 });
    }

    const updated = await prisma.payment.update({
      where: { reference },
      data: {
        txHash: cleanTx,
        network: network || payment.network,
        status: "pending",
      },
    });

    const verification = await verifyCryptoPayment(updated);

    if (verification.valid) {
      const upgrade = await confirmPaymentAndUpgrade(updated.id);
      if (upgrade.ok) {
        return NextResponse.json({
          success: true,
          autoConfirmed: true,
          payment: {
            id: updated.id,
            reference: updated.reference,
            status: "confirmed",
            txHash: cleanTx,
          },
          message: `Payment verified on-chain. Your ${upgrade.plan} plan is now active for 30 days.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      autoConfirmed: false,
      payment: {
        id: updated.id,
        reference: updated.reference,
        status: updated.status,
        txHash: cleanTx,
      },
      verificationError: verification.error,
      message: verification.error
        ? `Payment proof saved. Auto-verify could not complete (${verification.error}). An admin will review shortly.`
        : "Payment proof submitted. An admin will review the transaction on-chain and activate your plan shortly.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}