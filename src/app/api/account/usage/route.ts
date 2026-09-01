import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { getQuotaSnapshot } from "@/lib/quota";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const usage = await getQuotaSnapshot(userId);
  return NextResponse.json({ usage });
}
