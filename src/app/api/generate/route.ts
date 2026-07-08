import { NextResponse } from "next/server";
import { triggersVideoGeneration } from "@/lib/content-formats";
import {
  getAiImageProvider,
  getAiVideoProvider,
} from "@/lib/integrations";
import { hasVideoProvider } from "@/lib/ai-video";
import { generateSmartPost } from "@/lib/smart-generator";
import { startVoiceoverGeneration } from "@/lib/voice-generator";
import { startVideoGeneration } from "@/lib/video-generator";
import type { ContentType, GenerateRequest, SiteData, StoryMedia } from "@/lib/types";
import {
  getUserPlanInfo,
  isActivePaidPlan,
  isAuthError,
  requirePaidUserId,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getPromptPreferences } from "@/lib/learning-preferences";
import { isEnterprisePlusPlan } from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasVoiceProvider } from "@/lib/ai-voice";
import { loadInfluencerGenerateContext } from "@/lib/viraforge/influencer-bridge";
import type { InfluencerMotionType } from "@/lib/viraforge/influencer-assets";
import { normalizeMotionTypeSelection } from "@/lib/viraforge/motion-actions";
import {
  canGenerateFreshMotion,
  startContentStudioMotionClips,
} from "@/lib/viraforge/content-studio-motion";

export async function POST(request: Request) {
  const userId = await requirePaidUserId();
  if (isAuthError(userId)) return userId;

  const rl = checkRateLimit(userId as string, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Generation rate limit exceeded. Please retry in ~${rl.retryAfterSeconds}s.`, retryAfter: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();

    if (!body.site?.pages?.length) {
      return NextResponse.json(
        { error: "Site data is required. Crawl a domain first." },
        { status: 400 },
      );
    }

    const contentType = (body.contentType ?? "Social Post") as ContentType;
    const storyMedia = (body.storyMedia ?? "image") as StoryMedia;

    if (contentType === "Reel" && !hasVideoProvider()) {
      return NextResponse.json(
        {
          error:
            "Reel video generation requires REPLICATE_API_TOKEN. Add it in Settings → Integrations.",
        },
        { status: 503 },
      );
    }

    if (
      contentType === "Story" &&
      storyMedia === "image" &&
      !getAiImageProvider()
    ) {
      return NextResponse.json(
        {
          error:
            "Story image generation requires OPENAI_API_KEY or XAI_API_KEY. Add one in Settings → Integrations.",
        },
        { status: 503 },
      );
    }

    if (
      contentType === "Story" &&
      storyMedia === "video" &&
      !getAiVideoProvider()
    ) {
      return NextResponse.json(
        {
          error:
            "Story video generation requires REPLICATE_API_TOKEN. Add it in Settings → Integrations.",
        },
        { status: 503 },
      );
    }

    const promptPreferences = await getPromptPreferences(userId as string);
    const site = body.site as SiteData;

    let influencerContext;
    let influencerVoice = false;
    const influencerId =
      typeof body.influencerId === "string" ? body.influencerId : undefined;

    if (influencerId) {
      const sourcePageUrl = body.sourcePageUrl as string | undefined;
      const page =
        (sourcePageUrl
          ? site.pages.find((p) => p.url === sourcePageUrl)
          : undefined) ??
        site.pages.find((p) => p.path === "/") ??
        site.pages[0];

      influencerContext = await loadInfluencerGenerateContext(
        userId as string,
        influencerId,
        site,
        page,
      );

      if (!influencerContext) {
        return NextResponse.json(
          { error: "Influencer not found or missing product facts." },
          { status: 404 },
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId as string },
        select: { role: true, plan: true, subscriptionEndsAt: true },
      });
      const planInfo = await getUserPlanInfo(userId as string);
      influencerVoice =
        user?.role === "admin" ||
        (!!planInfo &&
          isEnterprisePlusPlan(planInfo.plan) &&
          isActivePaidPlan(planInfo.plan, planInfo.subscriptionEndsAt));
    }

    const useInfluencerPortrait = body.useInfluencerPortrait ?? true;
    const visualMode =
      body.influencerVisualMode ??
      (body.useInfluencerMotion === false ? "portrait" : influencerVoice ? "fresh" : "saved");
    const motionTypes = normalizeMotionTypeSelection(
      body.influencerMotionTypes as InfluencerMotionType[] | undefined,
    );
    const generateFreshMotion =
      !!influencerContext &&
      useInfluencerPortrait &&
      visualMode === "fresh" &&
      canGenerateFreshMotion(motionTypes);

    const generateRequest: GenerateRequest = {
      site,
      contentType,
      platform: body.platform ?? "instagram",
      prompt: body.prompt ?? "",
      sourcePageUrl: body.sourcePageUrl,
      settings: {
        ...body.settings,
        promptPreferences: promptPreferences ?? body.settings?.promptPreferences,
      },
      preferAiImage: body.preferAiImage,
      videoDuration: body.videoDuration,
      storyMedia,
      visualTargeting: body.visualTargeting,
      contentAngle: body.contentAngle,
      existingPosts: body.existingPosts,
      influencer: influencerContext ?? undefined,
      useInfluencerPortrait,
      useInfluencerMotion: visualMode === "saved",
      influencerVoice,
      influencerVisualMode: visualMode,
      influencerMotionTypes: motionTypes,
      generateFreshMotion,
    };

    const post = await generateSmartPost(generateRequest);
    if (influencerId) {
      post.influencerId = influencerId;
    }

    if (generateFreshMotion && influencerContext) {
      const motionResult = await startContentStudioMotionClips({
        userId: userId as string,
        influencer: influencerContext,
        motionTypes,
        draftText: post.text,
        siteDomain: site.domain,
      });

      const clips = motionResult.clips ?? [];
      if (clips.length > 0) {
        const [primary, ...supplemental] = clips;
        post.image = {
          ...post.image,
          motionType: primary.motionType,
          motionJobId: primary.motionJobId,
          videoStatus: "processing",
          aspectRatio: "9:16",
          ...(primary.voiceAudioUrl
            ? {
                audioUrl: primary.voiceAudioUrl,
                voiceoverScript: primary.script,
              }
            : {}),
          ...(supplemental.length > 0
            ? {
                supplementalClips: supplemental.map((clip) => ({
                  motionType: clip.motionType,
                  motionJobId: clip.motionJobId,
                  videoStatus: "processing" as const,
                  ...(clip.voiceAudioUrl
                    ? {
                        audioUrl: clip.voiceAudioUrl,
                        voiceoverScript: clip.script,
                      }
                    : {}),
                })),
              }
            : {}),
        };

        const labels = clips.map((c) => c.motionType).join(" + ");
        post.insights = [
          ...post.insights,
          clips.length > 1
            ? `Rendering ${clips.length} influencer clips (${labels}) — companion voice tracks appear as each clip finishes.`
            : primary.motionType === "talk"
              ? "Rendering influencer talk clip with lip-sync — voiceover is ready below."
              : `Rendering ${primary.motionType} motion clip — AI script and voice paired where available.`,
        ];
      }

      if ("error" in motionResult) {
        post.insights = [...post.insights, motionResult.error];
      }
    }

    if (triggersVideoGeneration(contentType, storyMedia)) {
      const durationSec = body.videoDuration === 10 ? 10 : 5;
      const videoRl = checkRateLimit(userId as string, "video");
      if (!videoRl.allowed) {
        post.image = { ...post.image, videoStatus: "failed" };
        post.insights = [
          ...post.insights,
          `Video rate limit exceeded. Retry in ~${videoRl.retryAfterSeconds}s.`,
        ];
      } else {
        const influencerVoiceId = influencerContext?.assets.voiceId;
        const voicePromise = hasVoiceProvider()
          ? (async () => {
              const voiceRl = checkRateLimit(userId as string, "voice");
              if (!voiceRl.allowed) {
                return {
                  error: `Voiceover rate limit exceeded. Retry in ~${voiceRl.retryAfterSeconds}s.`,
                } as const;
              }
              return startVoiceoverGeneration(
                post.text,
                durationSec,
                influencerVoiceId,
              );
            })()
          : Promise.resolve(null);

        const [videoResult, voiceResult] = await Promise.all([
          startVideoGeneration(
            userId as string,
            body.site,
            body.platform ?? "instagram",
            {
              prompt: body.prompt ?? "",
              sourcePageUrl: body.sourcePageUrl,
              durationSec,
              visualTargeting: body.visualTargeting,
              contentType,
            },
          ),
          voicePromise,
        ]);

        if ("jobId" in videoResult) {
          post.image = {
            ...post.image,
            videoStatus: "processing",
            videoJobId: videoResult.jobId,
            aspectRatio: videoResult.aspectRatio,
            durationSec: videoResult.durationSec,
          };
        } else {
          post.image = { ...post.image, videoStatus: "failed" };
          post.insights = [...post.insights, videoResult.error];
        }

        if (voiceResult && "audioUrl" in voiceResult) {
          post.image = {
            ...post.image,
            audioUrl: voiceResult.audioUrl,
            voiceoverScript: voiceResult.script,
          };
          post.insights = [
            ...post.insights,
            "AI voiceover ready — combine with video in your editor or publish as-is.",
          ];
        } else if (voiceResult && "error" in voiceResult) {
          post.insights = [...post.insights, voiceResult.error];
        } else if (!hasVoiceProvider() && (contentType === "Reel" || contentType === "Video Ad")) {
          post.insights = [
            ...post.insights,
            "Optional: add ELEVENLABS_API_KEY (+ BLOB_READ_WRITE_TOKEN) for Reel MP3 voiceovers.",
          ];
        }
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}