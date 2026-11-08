import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateNeighborChat,
  listWorldChats,
} from "@/lib/viraforge/avatar-world";

export const maxDuration = 60;

const chatSchema = z.object({
  aId: z.string().min(1),
  bId: z.string().min(1),
  topic: z.string().max(280).optional(),
});

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;
  const chats = await listWorldChats(userId, 8);
  return NextResponse.json({ chats });
}

export async function POST(request: Request) {
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
    const parsed = chatSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Pick two avatars" },
        { status: 400 },
      );
    }
    if (parsed.data.aId === parsed.data.bId) {
      return NextResponse.json(
        { error: "Pick two different avatars" },
        { status: 400 },
      );
    }

    const topic = parsed.data.topic?.trim();
    const chat = await generateNeighborChat({
      userId,
      aId: parsed.data.aId,
      bId: parsed.data.bId,
      scene: topic
        ? `They are talking about this: ${topic}. Stay in their own voices. Not a post. Not a pitch.`
        : undefined,
    });

    return NextResponse.json({ chat });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start the chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
