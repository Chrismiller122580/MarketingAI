import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { linkUserCookieHeader } from "@/lib/social/link-uid";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const host = request.headers.get("host") ?? "";
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", linkUserCookieHeader(userId, host));
  return response;
}
