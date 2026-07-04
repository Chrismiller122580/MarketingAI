import { NextResponse } from "next/server";
import { triggersVideoGeneration } from "@/lib/content-formats";
import {
  getAiImageProvider,
  getAiVideoProvider,
} from "@/lib/integrations";
import { hasVideoProvider } from "@/lib/ai-video";
import { generateSmartPost } from "@/lib/smart-generator";
import { startVideoGeneration } from "@/lib/video-generator";
import type { ContentType, GenerateRequest, StoryMedia } from "@/lib/types";
import { requirePaidUserId, isAuthError } from "@/lib/auth-helpers";
import { getPromptPreferences } from "@/lib/learning-preferences";
import { checkRateLimit } from "@/lib/rate-limit";

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

    const generateRequest: GenerateRequest = {
      site: body.site,
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
    };

    const post = await generateSmartPost(generateRequest);

    if (triggersVideoGeneration(contentType, storyMedia)) {
      const videoRl = checkRateLimit(userId as string, "video");
      if (!videoRl.allowed) {
        post.image = { ...post.image, videoStatus: "failed" };
        post.insights = [
          ...post.insights,
          `Video rate limit exceeded. Retry in ~${videoRl.retryAfterSeconds}s.`,
        ];
      } else {
        const videoResult = await startVideoGeneration(
          userId as string,
          body.site,
          body.platform ?? "instagram",
          {
            prompt: body.prompt ?? "",
            sourcePageUrl: body.sourcePageUrl,
            durationSec: body.videoDuration === 10 ? 10 : 5,
            visualTargeting: body.visualTargeting,
            contentType,
          },
        );

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
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}