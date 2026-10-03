import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { listPublicWorldTown } from "@/lib/viraforge/avatar-world";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;
  const town = await listPublicWorldTown();
  return NextResponse.json(town);
}
