import { NextResponse } from "next/server";
import { verifyInstagramCredentials } from "@/lib/social/instagram";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const hasOAuth = !!(
    process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET
  );

  if (!token || !accountId) {
    return NextResponse.json({
      connected: false,
      oauthConfigured: hasOAuth,
      error:
        "INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID required for global posting, or connect per-site via OAuth.",
    });
  }

  const result = await verifyInstagramCredentials(token, accountId);

  return NextResponse.json({
    connected: result.ok,
    oauthConfigured: hasOAuth,
    accountId,
    username: result.username,
    error: result.error,
  });
}