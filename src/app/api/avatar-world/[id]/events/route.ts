import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  listInfluencerWorldEvents,
  patchWorldProfile,
  recordWorldEvent,
} from "@/lib/viraforge/avatar-world";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const events = await listInfluencerWorldEvents(authResult, id, 80);
  return NextResponse.json({ events });
}

const eventSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(800),
  kind: z
    .enum([
      "milestone",
      "mood",
      "travel",
      "collab",
      "lesson",
      "everyday",
      "create",
    ])
    .default("everyday"),
  mood: z.string().max(40).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await context.params;
    const influencer = await prisma.influencer.findFirst({
      where: { id, userId: authResult },
      select: { id: true },
    });
    if (!influencer) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id: eventId, createdAt } = await recordWorldEvent({
      userId: authResult,
      influencerId: id,
      eventType: "life_event",
      payload: parsed.data,
    });

    if (parsed.data.mood) {
      await patchWorldProfile(authResult, id, {
        mood: parsed.data.mood,
        moodNote: parsed.data.title,
      });
    }

    return NextResponse.json({
      event: {
        id: eventId,
        influencerId: id,
        eventType: "life_event",
        ...parsed.data,
        createdAt: createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save life event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
