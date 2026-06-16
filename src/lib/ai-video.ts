import type { Platform, SiteData, SitePage } from "./types";
import {
  enrichVisualPrompt,
  type VisualTargeting,
} from "./visual-targeting";

export type VideoAspectRatio = "9:16" | "16:9" | "1:1";

const PLATFORM_ASPECT: Record<Platform, VideoAspectRatio> = {
  instagram: "9:16",
  twitter: "16:9",
  linkedin: "16:9",
  facebook: "16:9",
  pinterest: "9:16",
  email: "16:9",
};

const REPLICATE_MODEL = "bytedance/seedance-1-lite";

export function getVideoAspectRatio(platform: Platform): VideoAspectRatio {
  return PLATFORM_ASPECT[platform];
}

export function buildVideoPrompt(
  site: SiteData,
  page: SitePage,
  platform: Platform,
  brief?: string,
  visualTargeting?: VisualTargeting,
): string {
  const keywords = site.brand.keywords.slice(0, 5).join(", ");
  const base = [
    `Short-form video ad for ${site.brand.name}.`,
    `Hook: ${page.headings[0] || page.title}.`,
    page.description ? `Message: ${page.description.slice(0, 100)}.` : "",
    `Brand tone: ${site.brand.tone}. Keywords: ${keywords}.`,
    `Visual style: cinematic, modern, high-energy marketing creative for ${platform}.`,
    "Smooth camera movement, professional lighting, no text overlays, no watermarks.",
    brief ? `Campaign angle: ${brief}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return enrichVisualPrompt(base, visualTargeting, "video");
}

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  error?: string | null;
};

export async function createVideoPrediction(
  prompt: string,
  aspectRatio: VideoAspectRatio,
  durationSec = 5,
): Promise<{ predictionId: string } | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt,
            aspect_ratio: aspectRatio,
            duration: durationSec,
          },
        }),
      },
    );

    if (!response.ok) return null;
    const data = (await response.json()) as ReplicatePrediction;
    if (!data.id) return null;
    return { predictionId: data.id };
  } catch {
    return null;
  }
}

export async function getVideoPredictionStatus(
  predictionId: string,
): Promise<{
  status: "processing" | "ready" | "failed";
  videoUrl?: string;
  error?: string;
} | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) return null;
    const data = (await response.json()) as ReplicatePrediction;

    if (data.status === "succeeded") {
      const output = data.output;
      const videoUrl = Array.isArray(output) ? output[0] : output;
      if (typeof videoUrl === "string" && videoUrl) {
        return { status: "ready", videoUrl };
      }
      return { status: "failed", error: "No video output returned" };
    }

    if (data.status === "failed" || data.status === "canceled") {
      return {
        status: "failed",
        error: data.error ?? "Video generation failed",
      };
    }

    return { status: "processing" };
  } catch {
    return null;
  }
}

export function hasVideoProvider(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}