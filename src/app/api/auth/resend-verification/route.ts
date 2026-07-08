import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/auth-email";
import { createVerificationToken } from "@/lib/auth-tokens";
import { requireAuthUserId, isAuthError } from "@/lib/auth-helpers";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const ip = getClientIp(request);
  const rl = checkIpRateLimit(ip, "authResendVerification");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ~${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" });
    }

    const token = await createVerificationToken("verify", user.email);
    const sent = await sendVerificationEmail(user.email, token);

    if (!sent.ok) {
      return NextResponse.json(
        {
          error:
            sent.error ??
            "Failed to send verification email. Configure RESEND_API_KEY and EMAIL_FROM in Vercel.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("[resend-verification] failed:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 },
    );
  }
}