import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { uploadBytesToBlob } from "@/lib/media-url";
import { recordWorldEvent } from "@/lib/viraforge/avatar-world";
import {
  createInfluencerRender,
  finalizeInfluencerRender,
} from "@/lib/viraforge/influencer-renders";
import { concatMotionVideos } from "@/lib/viraforge/video-concat";

export const maxDuration = 120;

const mergeSchema = z.object({
  influencerId: z.string().min(1),
  renderIds: z.array(z.string().min(1)).min(2).max(6),
});

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const rl = checkRateLimit(authResult, "video");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Retry in ~${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const parsed = mergeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Pick 2–6 saved clips to merge" },
        { status: 400 },
      );
    }

    const influencer = await prisma.influencer.findFirst({
      where: { id: parsed.data.influencerId, userId: authResult },
      select: { id: true, displayName: true },
    });
    if (!influencer) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const renders = await prisma.influencerRender.findMany({
      where: {
        userId: authResult,
        influencerId: influencer.id,
        id: { in: parsed.data.renderIds },
        status: "ready",
        url: { not: null },
        type: { in: ["motion", "merged"] },
      },
    });

    const ordered = parsed.data.renderIds
      .map((id) => renders.find((row) => row.id === id))
      .filter((row): row is (typeof renders)[number] => !!row && !!row.url);

    if (ordered.length < 2) {
      return NextResponse.json(
        { error: "Need at least two ready video clips" },
        { status: 400 },
      );
    }

    const { id: renderId } = await createInfluencerRender({
      userId: authResult,
      influencerId: influencer.id,
      type: "merged",
      status: "processing",
      motionType: "talk",
      script: ordered
        .map((row) => row.script)
        .filter(Boolean)
        .join("\n\n"),
      metadata: {
        source: "merge",
        sourceRenderIds: ordered.map((row) => row.id),
      },
    });

    const buffer = await concatMotionVideos(ordered.map((row) => row.url!));
    const durableUrl = await uploadBytesToBlob(
      buffer,
      `influencers/${authResult}/${influencer.id}/${renderId}-reel.mp4`,
      "video/mp4",
    );

    const finalized = await finalizeInfluencerRender({
      userId: authResult,
      influencerId: influencer.id,
      renderId,
      status: "ready",
      url: durableUrl,
      activate: true,
    });

    await recordWorldEvent({
      userId: authResult,
      influencerId: influencer.id,
      eventType: "world_merge",
      payload: {
        kind: "create",
        title: "Cut a longer reel",
        body: `Merged ${ordered.length} clips into one post for ${influencer.displayName}.`,
        renderId,
      },
    });

    return NextResponse.json({
      render: finalized,
      url: durableUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not merge clips";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
