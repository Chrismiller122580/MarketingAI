import { NextResponse } from "next/server";
import { generateSmartPost } from "@/lib/smart-generator";
import { startVideoGeneration } from "@/lib/video-generator";
import type { GenerateRequest } from "@/lib/types";
import { requirePaidUserId, isAuthError } from "@/lib/auth-helpers";
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

    const contentType = body.contentType ?? "Social Post";

    const generateRequest: GenerateRequest = {
      site: body.site,
      contentType,
      platform: body.platform ?? "instagram",
      prompt: body.prompt ?? "",
      sourcePageUrl: body.sourcePageUrl,
      settings: body.settings,
      preferAiImage: body.preferAiImage,
      videoDuration: body.videoDuration,
      visualTargeting: body.visualTargeting,
    };

    const post = await generateSmartPost(generateRequest);

    if (contentType === "Video Ad") {
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