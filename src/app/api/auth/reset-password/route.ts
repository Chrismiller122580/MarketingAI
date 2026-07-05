import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { consumeVerificationToken } from "@/lib/auth-tokens";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const email = await consumeVerificationToken("reset", token);
    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("[reset-password] failed:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 },
    );
  }
}