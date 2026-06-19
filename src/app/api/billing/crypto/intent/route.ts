import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  generateReference,
  getNetworkLabel,
  getReceiverAddress,
  isValidXrpAddress,
  isXrpNetwork,
  PRICING,
  type PlanKey,
} from "@/lib/billing";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = (body.plan || "").toLowerCase() as PlanKey;
  if (!PRICING[plan]) {
    return NextResponse.json({ error: "Invalid plan. Choose pro or enterprise." }, { status: 400 });
  }

  const pricing = PRICING[plan];
  const reference = generateReference(userId as string, plan);
  const receiverAddress = getReceiverAddress();

  if (isXrpNetwork(pricing.network) && !isValidXrpAddress(receiverAddress)) {
    return NextResponse.json(
      { error: "XRP receiver address is not configured correctly on the server." },
      { status: 500 },
    );
  }

  // Create a pending payment record immediately so admin and user can track it
  try {
    const payment = await prisma.payment.create({
      data: {
        userId: userId as string,
        provider: "crypto",
        plan,
        amount: pricing.amount,
        currency: pricing.currency,
        network: pricing.network,
        reference,
        status: "pending",
      },
    });

    return NextResponse.json({
      payment: {
        id: payment.id,
        reference,
        plan,
        amount: pricing.amount,
        currency: pricing.currency,
        network: pricing.network,
        receiverAddress,
        instructions: `Send exactly ${pricing.amount} ${pricing.currency} on ${getNetworkLabel(pricing.network)} to the address below. Connect your XRP wallet or submit the transaction hash after sending.`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment intent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
