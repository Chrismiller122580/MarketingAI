import { NextResponse } from "next/server";
import { isAuthError, requireAvatarWorldAdmin } from "@/lib/auth-helpers";
import { loadWorldHub } from "@/lib/viraforge/avatar-world";

export async function GET() {
  const authResult = await requireAvatarWorldAdmin();
  if (isAuthError(authResult)) return authResult;

  const hub = await loadWorldHub(authResult);
  return NextResponse.json(hub);
}