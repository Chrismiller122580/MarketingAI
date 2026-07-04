import type { ContentType, Platform, VideoAspectRatio } from "./types";

export function isVideoContentType(contentType: ContentType): boolean {
  return contentType === "Video Ad" || contentType === "Reel";
}

export function isVerticalContentType(contentType: ContentType): boolean {
  return contentType === "Reel" || contentType === "Story";
}

export function isInstagramFormat(contentType: ContentType): boolean {
  return isVerticalContentType(contentType);
}

export function getVideoAspectRatioForContent(
  contentType: ContentType,
  platform: Platform,
): VideoAspectRatio {
  if (contentType === "Reel" || contentType === "Story") return "9:16";
  const platformAspect: Record<Platform, VideoAspectRatio> = {
    instagram: "9:16",
    twitter: "16:9",
    linkedin: "16:9",
    facebook: "16:9",
    pinterest: "9:16",
    email: "16:9",
  };
  return platformAspect[platform];
}

export function getVisualCanvasSize(
  platform: Platform,
  contentType: ContentType,
): { width: number; height: number } {
  if (isVerticalContentType(contentType)) {
    return { width: 1080, height: 1920 };
  }
  const sizes: Record<Platform, { width: number; height: number }> = {
    instagram: { width: 1080, height: 1080 },
    twitter: { width: 1200, height: 675 },
    linkedin: { width: 1200, height: 627 },
    facebook: { width: 1200, height: 630 },
    pinterest: { width: 1000, height: 1500 },
    email: { width: 1200, height: 630 },
  };
  return sizes[platform] ?? sizes.instagram;
}

export function instagramMediaType(
  contentType: ContentType,
  hasVideo: boolean,
): "REELS" | "STORIES" | "IMAGE" {
  if (contentType === "Story") return "STORIES";
  if (hasVideo || contentType === "Reel") return "REELS";
  return "IMAGE";
}

export function triggersVideoGeneration(
  contentType: ContentType,
  storyMedia?: "image" | "video",
): boolean {
  return (
    isVideoContentType(contentType) ||
    (contentType === "Story" && storyMedia === "video")
  );
}