import { NextResponse } from "next/server";
import { listPublicWorldTown } from "@/lib/viraforge/avatar-world";

export const dynamic = "force-dynamic";

export async function GET() {
  const town = await listPublicWorldTown();
  return NextResponse.json(town);
}
