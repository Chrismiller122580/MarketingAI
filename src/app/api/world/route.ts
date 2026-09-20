import { NextResponse } from "next/server";
import { listPublicWorldAvatars } from "@/lib/viraforge/avatar-world";

export const dynamic = "force-dynamic";

export async function GET() {
  const avatars = await listPublicWorldAvatars();
  return NextResponse.json({ avatars });
}
