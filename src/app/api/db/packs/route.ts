import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { packToData } from "@/lib/db-mappers";
import type { SavedPost } from "@/lib/types";

export async function GET() {
  try {
    const packs = await prisma.campaignPack.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ packs: packs.map(packToData) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name as string;
    const posts = body.posts as SavedPost[];

    if (!name || !posts?.length) {
      return NextResponse.json({ error: "Invalid pack data" }, { status: 400 });
    }

    const pack = await prisma.campaignPack.create({
      data: { name, posts },
    });

    return NextResponse.json({ pack: packToData(pack) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.campaignPack.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}