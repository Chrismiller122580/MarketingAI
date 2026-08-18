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
import {
  createInfluencerRender,
  finalizeInfluencerRender,
} from "@/lib/viraforge/influencer-renders";
import { concatMotionVideos } from "@/lib/viraforge/video-concat";
import { uploadBytesToBlob } from "@/lib/media-url";

export const maxDuration = 120;

const collabSchema = z.object({
  leadId: z.string().min(1),
  partnerId: z.string().min(1),
  brief: z.string().max(500).optional(),
  mergeVideos: z.boolean().optional(),
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
});

export async function POST(request: Request) {
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
    const parsed = collabSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Pick two avatars to collaborate" },
        { status: 400 },
      );
    }
    if (parsed.data.leadId === parsed.data.partnerId) {
      return NextResponse.json(
        { error: "Pick two different avatars" },
        { status: 400 },
      );
    }

    const [lead, partner] = await Promise.all([
      loadWorldDetail(authResult, parsed.data.leadId),
      loadWorldDetail(authResult, parsed.data.partnerId),
    ]);
    if (!lead || !partner) {
      return NextResponse.json({ error: "Both avatars must exist" }, { status: 404 });
    }

    const generated = await generateBackstoryContent({
      persona: lead.persona,
      world: lead.world,
      recentEvents: lead.events,
      prompt: parsed.data.brief,
      platform: parsed.data.platform,
      partner: {
        displayName: partner.displayName,
        handle: partner.handle,
        backstory: partner.world.backstory,
        personalityVoice: partner.persona.personalityVoice,
      },
    });

    let mergedVideoUrl: string | undefined;
    if (parsed.data.mergeVideos) {
      const leadClip =
        lead.renders.find((r) => r.type === "motion" && r.status === "ready" && r.url)
          ?.url ?? lead.assets.videoUrl;
      const partnerClip =
        partner.renders.find(
          (r) => r.type === "motion" && r.status === "ready" && r.url,
        )?.url ?? partner.assets.videoUrl;
      if (leadClip && partnerClip) {
        const buffer = await concatMotionVideos([leadClip, partnerClip]);
        const { id: renderId } = await createInfluencerRender({
          userId: authResult,
          influencerId: lead.id,
          type: "merged",
          status: "processing",
          motionType: "talk",
          script: generated.text,
          metadata: {
            source: "collab",
            partnerId: partner.id,
            partnerHandle: partner.handle,
          },
        });
        const durableUrl = await uploadBytesToBlob(
          buffer,
          `influencers/${authResult}/${lead.id}/${renderId}-collab.mp4`,
          "video/mp4",
        );
        await finalizeInfluencerRender({
          userId: authResult,
          influencerId: lead.id,
          renderId,
          status: "ready",
          url: durableUrl,
          activate: true,
        });
        mergedVideoUrl = durableUrl;
      }
    }

    const post = buildWorldGeneratedPost({
      text: generated.text,
      persona: lead.persona,
      influencerId: lead.id,
      platform: parsed.data.platform,
      contentType: mergedVideoUrl ? "Reel" : "Social Post",
      portraitUrl: lead.assets.portraitUrl,
      videoUrl: mergedVideoUrl ?? lead.assets.videoUrl,
      insights: [
        "avatar-world",
        "collab",
        `@${partner.handle}`,
        `@${lead.handle}`,
      ],
    });

    const saved = await saveWorldPost({
      userId: authResult,
      influencerId: lead.id,
      post,
    });

    await Promise.all([
      recordWorldEvent({
        userId: authResult,
        influencerId: lead.id,
        eventType: "world_collab",
        payload: {
          kind: "collab",
          title: `Collab with @${partner.handle}`,
          body: generated.text.slice(0, 280),
          relatedInfluencerId: partner.id,
          relatedHandle: partner.handle,
          postId: saved.id,
        },
      }),
      recordWorldEvent({
        userId: authResult,
        influencerId: partner.id,
        eventType: "world_collab",
        payload: {
          kind: "collab",
          title: `Collab with @${lead.handle}`,
          body: generated.text.slice(0, 280),
          relatedInfluencerId: lead.id,
          relatedHandle: lead.handle,
          postId: saved.id,
        },
      }),
    ]);

    return NextResponse.json({
      text: generated.text,
      usedAi: generated.usedAi,
      postId: saved.id,
      mergedVideoUrl,
      post,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Collaboration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
