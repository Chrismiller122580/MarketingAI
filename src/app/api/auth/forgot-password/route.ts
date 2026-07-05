import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/auth-email";
import { createVerificationToken } from "@/lib/auth-tokens";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkIpRateLimit(ip, "authForgotPassword");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ~${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, passwordHash: true },
    });

    if (user?.passwordHash) {
      const token = await createVerificationToken("reset", email);
      const sent = await sendPasswordResetEmail(email, token);
      if (!sent.ok && process.env.NODE_ENV === "development") {
        console.warn("[forgot-password] email not sent:", sent.error);
      }
    }

    return NextResponse.json({
      message:
        "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("[forgot-password] failed:", error);
    return NextResponse.json(
      { message: "If an account exists with that email, a reset link has been sent." },
    );
  }
}