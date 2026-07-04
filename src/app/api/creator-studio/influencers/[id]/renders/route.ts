import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  activateInfluencerRender,
  listInfluencerRenders,
  type InfluencerRenderType,
} from "@/lib/viraforge/influencer-renders";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const influencer = await prisma.influencer.findFirst({
    where: { id, userId: authResult },
  });
  if (!influencer) {
    return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as InfluencerRenderType | null;
  const limit = Number(searchParams.get("limit") ?? "100");

  const renders = await listInfluencerRenders(authResult, id, {
    type: type ?? undefined,
    limit: Number.isFinite(limit) ? limit : 100,
  });

  return NextResponse.json({ renders });
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const body = await request.json();
  const renderId = body.renderId as string | undefined;

  if (!renderId) {
    return NextResponse.json({ error: "renderId is required" }, { status: 400 });
  }

  const influencer = await prisma.influencer.findFirst({
    where: { id, userId: authResult },
  });
  if (!influencer) {
    return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
  }

  const render = await prisma.influencerRender.findFirst({
    where: { id: renderId, userId: authResult, influencerId: id, status: "ready" },
  });
  if (!render) {
    return NextResponse.json({ error: "Render not found or not ready" }, { status: 404 });
  }

  const assets = await activateInfluencerRender(authResult, renderId);
  if (!assets) {
    return NextResponse.json({ error: "Failed to apply render" }, { status: 500 });
  }

  return NextResponse.json({ assets });
}