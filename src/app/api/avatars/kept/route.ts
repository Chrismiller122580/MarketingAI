import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { recordCreatorEvent } from "@/lib/viraforge/learning";

const keptSchema = z.object({
  text: z.string().min(1).max(500),
  source: z.string().max(40).default("tiktok"),
  influencerId: z.string().min(1).optional(),
  fromLife: z.boolean().optional(),
});

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const rows = await prisma.creatorLearningEvent.findMany({
    where: { userId, eventType: { in: ["line_tried", "line_kept"] } },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { influencer: { select: { displayName: true } } },
  });

  return NextResponse.json({
    lines: rows.map((row) => {
      const payload =
        row.payload && typeof row.payload === "object"
          ? (row.payload as Record<string, unknown>)
          : {};
      return {
        id: row.id,
        kept: row.eventType === "line_kept",
        text: typeof payload.text === "string" ? payload.text : "",
        source: typeof payload.source === "string" ? payload.source : "",
        fromLife: payload.fromLife === true,
        name: row.influencer?.displayName ?? "",
        createdAt: row.createdAt.toISOString(),
      };
    }),
  });
}

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const parsed = keptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Need the line you kept" }, { status: 400 });
  }

  await recordCreatorEvent(
    userId,
    "line_kept",
    {
      text: parsed.data.text.slice(0, 500),
      source: parsed.data.source,
      fromLife: parsed.data.fromLife === true,
    },
    parsed.data.influencerId,
  );

  return NextResponse.json({ ok: true });
}
