import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildWorldGeneratedPost,
  generateBackstoryContent,
  loadWorldDetail,
  recordWorldEvent,
  saveWorldPost,
} from "@/lib/viraforge/avatar-world";
import { createInfluencerRender } from "@/lib/viraforge/influencer-renders";

type RouteContext = { params: Promise<{ id: string }> };

const contentSchema = z.object({
  prompt: z.string().max(500).optional(),
  platform: z
    .enum([
      "instagram",
      "twitter",
      "linkedin",
      "facebook",
      "pinterest",
      "email",
    ])
    .default("instagram"),
  save: z.boolean().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const rl = checkRateLimit(authResult, "generate");
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
    const { id } = await context.params;
    const parsed = contentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const detail = await loadWorldDetail(authResult, id);
    if (!detail) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const generated = await generateBackstoryContent({
      persona: detail.persona,
      world: detail.world,
      facts: detail.facts,
      recentEvents: detail.events,
      prompt: parsed.data.prompt,
      platform: parsed.data.platform,
    });

    const post = buildWorldGeneratedPost({
      text: generated.text,
      persona: detail.persona,
      influencerId: detail.id,
      platform: parsed.data.platform,
      portraitUrl: detail.assets.portraitUrl,
      videoUrl: detail.assets.videoUrl,
      insights: ["avatar-world", "backstory", detail.world.mood],
    });

    let postId: string | undefined;
    if (parsed.data.save !== false) {
      const saved = await saveWorldPost({
        userId: authResult,
        influencerId: detail.id,
        post,
      });
      postId = saved.id;

      await createInfluencerRender({
        userId: authResult,
        influencerId: detail.id,
        type: "site_content",
        status: "ready",
        script: generated.text,
        metadata: {
          source: "avatar-world",
          platform: parsed.data.platform,
          postId,
        },
      });

      await recordWorldEvent({
        userId: authResult,
        influencerId: detail.id,
        eventType: "world_post",
        payload: {
          kind: "create",
          title: "Wrote a post from backstory",
          body: generated.text.slice(0, 280),
          mood: detail.world.mood,
          postId,
        },
      });
    }

    return NextResponse.json({
      text: generated.text,
      usedAi: generated.usedAi,
      post,
      postId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
