import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import { consumeVerificationToken } from "@/lib/auth-tokens";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthUserId } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";
  const origin = getAppOrigin();

  // Do not consume on GET — mail scanners prefetch these links.
  // The public page POSTs once the person actually opens it.
  if (!token) {
    return NextResponse.redirect(`${origin}/verify-email?error=invalid`);
  }

  return NextResponse.redirect(
    `${origin}/verify-email?token=${encodeURIComponent(token)}`,
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkIpRateLimit(ip, "authVerifyEmail");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Retry in ~${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    token = "";
  }

  if (!token) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const email = await consumeVerificationToken("verify", token);
  if (!email) {
    const userId = await getAuthUserId();
    if (userId) {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      });
      if (existing?.emailVerified) {
        return NextResponse.json({ ok: true, alreadyVerified: true });
      }
    }
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
