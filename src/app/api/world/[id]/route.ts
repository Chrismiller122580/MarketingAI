import { NextResponse } from "next/server";
import { loadPublicWorldProfile } from "@/lib/viraforge/avatar-world";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const profile = await loadPublicWorldProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
