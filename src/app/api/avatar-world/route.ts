import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { loadWorldHub } from "@/lib/viraforge/avatar-world";

export async function GET() {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const hub = await loadWorldHub(authResult);
  return NextResponse.json(hub);
}