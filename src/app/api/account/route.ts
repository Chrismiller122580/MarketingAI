import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuthUserId, isAuthError } from "@/lib/auth-helpers";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      emailVerified: user.emailVerified?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[account] PATCH failed:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete your account" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        role: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }

    if (user.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin account" },
          { status: 400 },
        );
      }
    }

    if (user.stripeSubscriptionId && isStripeConfigured()) {
      try {
        await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
      } catch (error) {
        console.error("[account] Stripe cancel on delete failed:", error);
      }
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[account] DELETE failed:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
