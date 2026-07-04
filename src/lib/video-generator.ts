import {
  buildVideoPrompt,
  createVideoPrediction,
  getVideoAspectRatio,
  hasVideoProvider,
} from "./ai-video";
import { createVideoJob } from "./video-jobs";
import type { ContentType, Platform, SiteData, VisualTargeting } from "./types";

export async function startVideoGeneration(
  userId: string,
  site: SiteData,
  platform: Platform,
  options: {
    prompt?: string;
    sourcePageUrl?: string;
    durationSec?: 5 | 10;
    visualTargeting?: VisualTargeting;
    contentType?: ContentType;
  },
): Promise<
  | {
      jobId: string;
      prompt: string;
      aspectRatio: ReturnType<typeof getVideoAspectRatio>;
      durationSec: number;
    }
  | { error: string }
> {
  if (!hasVideoProvider()) {
    return {
      error:
        "AI video generation unavailable. Add REPLICATE_API_TOKEN to enable Video Ads.",
    };
  }

  const sourcePageUrl = options.sourcePageUrl;
  const page =
    (sourcePageUrl
      ? site.pages.find((p) => p.url === sourcePageUrl)
      : null) ??
    site.pages.find((p) => p.path === "/") ??
    site.pages[0];

  const contentType = options.contentType ?? "Video Ad";
  const aspectRatio = getVideoAspectRatio(platform, contentType);
  const durationSec = options.durationSec === 10 ? 10 : 5;
  const videoPrompt = buildVideoPrompt(
    site,
    page,
    platform,
    options.prompt,
    options.visualTargeting,
    contentType,
  );

  const prediction = await createVideoPrediction(
    videoPrompt,
    aspectRatio,
    durationSec,
  );

  if (!prediction) {
    return { error: "Failed to start video generation. Check REPLICATE_API_TOKEN." };
  }

  const job = createVideoJob(
    userId,
    prediction.predictionId,
    videoPrompt,
    aspectRatio,
  );

  return {
    jobId: job.jobId,
    prompt: videoPrompt,
    aspectRatio,
    durationSec,
  };
}