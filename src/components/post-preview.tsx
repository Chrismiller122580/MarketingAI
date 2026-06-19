"use client";

import Image from "next/image";
import type { GeneratedPost, Platform } from "@/lib/types";
import { Spinner } from "./loading-indicator";

const platformLabels: Record<Platform, string> = {
  instagram: "Instagram",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  pinterest: "Pinterest",
  email: "Email",
};

const aspectClasses: Record<Platform, string> = {
  instagram: "aspect-square",
  twitter: "aspect-video",
  linkedin: "aspect-[1.91/1]",
  facebook: "aspect-[1.91/1]",
  pinterest: "aspect-[2/3] max-h-[420px]",
  email: "aspect-[1.91/1]",
};

const videoAspectClasses: Record<string, string> = {
  "9:16": "aspect-[9/16] max-h-[480px]",
  "16:9": "aspect-video",
  "1:1": "aspect-square",
};

export function PostPreview({
  post,
  videoLoading = false,
}: {
  post: GeneratedPost;
  videoLoading?: boolean;
}) {
  const isVideoAd = post.contentType === "Video Ad";
  const hasVideo = !!post.image.videoUrl;
  const videoProcessing =
    isVideoAd &&
    (videoLoading || post.image.videoStatus === "processing");
  const videoFailed = isVideoAd && post.image.videoStatus === "failed";

  const mediaAspect =
    isVideoAd && post.image.aspectRatio
      ? videoAspectClasses[post.image.aspectRatio] ?? "aspect-video"
      : aspectClasses[post.platform];

  const badgeLabel = hasVideo
    ? "AI video"
    : post.image.source === "edited"
      ? "Custom visual"
      : post.image.source === "site"
        ? "Site image"
        : post.image.source === "ai"
          ? "AI generated"
          : "Branded visual";

  const badgeColor = hasVideo
    ? "bg-violet-50 text-violet-700"
    : post.image.source === "edited"
      ? "bg-fuchsia-50 text-fuchsia-700"
      : post.image.source === "site"
        ? "bg-emerald-50 text-emerald-700"
        : post.image.source === "ai"
          ? "bg-teal-50 text-teal-700"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-crawl-700 to-spark-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {platformLabels[post.platform]}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{post.contentType}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {post.selectedProvider && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                post.selectedProvider === "openai"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              }`}
            >
              {post.selectedProvider === "openai" ? "GPT" : "Grok"}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      <div className={`relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${mediaAspect}`}>
        {hasVideo ? (
          <video
            src={post.image.videoUrl}
            controls
            playsInline
            className="h-full w-full object-cover"
            poster={post.image.url}
          />
        ) : (
          <Image
            src={post.image.url}
            alt={post.image.alt}
            fill
            unoptimized
            className="object-cover"
          />
        )}

        {videoProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <Spinner size="lg" className="border-white" />
            <p className="mt-3 text-sm font-medium text-white">
              Generating video ad…
            </p>
            <p className="mt-1 text-xs text-slate-300">Usually 1–3 minutes</p>
          </div>
        )}

        {videoFailed && !hasVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-900/50 backdrop-blur-sm">
            <p className="text-sm font-medium text-white">Video generation failed</p>
            <p className="mt-1 px-4 text-center text-xs text-rose-100">
              Check REPLICATE_API_TOKEN in Settings
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {post.text}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium text-amber-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{post.characterCount} characters</span>
          {post.sourcePage && <span>Source: {post.sourcePage}</span>}
        </div>
      </div>
    </div>
  );
}