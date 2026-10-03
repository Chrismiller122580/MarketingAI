import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { loadPublicWorldProfile } from "@/lib/viraforge/avatar-world";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;
  const { id } = await context.params;
  const profile = await loadPublicWorldProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
