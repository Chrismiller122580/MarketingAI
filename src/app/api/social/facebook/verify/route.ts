import { NextResponse } from "next/server";
import { verifyFacebookPageCredentials } from "@/lib/social/facebook";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!token || !pageId) {
    return NextResponse.json({
      connected: false,
      error: "FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID are required.",
    });
  }

  const result = await verifyFacebookPageCredentials(token, pageId);

  return NextResponse.json({
    connected: result.ok,
    pageId,
    pageName: result.pageName,
    error: result.error,
  });
}