import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  collectWorldLore,
  listWorldChats,
} from "@/lib/viraforge/avatar-world";
import { liveWorldDay } from "@/lib/viraforge/world-life";

export const maxDuration = 120;

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const [lore, chats, lastTick] = await Promise.all([
    collectWorldLore(userId),
    listWorldChats(userId, 6),
    prisma.creatorLearningEvent.findFirst({
      where: { userId, eventType: "world_tick" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const payload =
    lastTick?.payload && typeof lastTick.payload === "object"
      ? (lastTick.payload as Record<string, unknown>)
      : {};

  return NextResponse.json({
    lore,
    chats,
    lastDay: lastTick?.createdAt.toISOString() ?? null,
    lastBeat: typeof payload.body === "string" ? payload.body : "",
  });
}

export async function POST() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const rl = checkRateLimit(userId, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ~${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  try {
    const day = await liveWorldDay({ userId });
    return NextResponse.json({ day });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The day did not finish";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
