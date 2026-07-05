import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import { consumeVerificationToken } from "@/lib/auth-tokens";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";
  const origin = getAppOrigin();

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=invalid_token`);
  }

  const email = await consumeVerificationToken("verify", token);
  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=invalid_token`);
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(`${origin}/dashboard?verified=1`);
}