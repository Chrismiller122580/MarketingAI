"use client";

import Image from "next/image";
import { isVerticalContentType } from "@/lib/content-formats";
import type { GeneratedPost, InfluencerMotionClip, Platform } from "@/lib/types";
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
  const isVertical = isVerticalContentType(post.contentType);
  const expectsInfluencerMotion =
    !!post.image.motionJobId || !!post.image.videoUrl;
  const expectsVideo =
    post.contentType === "Reel" ||
    post.contentType === "Video Ad" ||
    (post.contentType === "Story" &&
      (!!post.image.videoJobId ||
        !!post.image.videoUrl ||
        !!post.image.videoStatus)) ||
    (post.image.source === "influencer" && expectsInfluencerMotion);
  const hasVideo = !!post.image.videoUrl;
  const supplementalClips = post.image.supplementalClips ?? [];
  const pendingSupplemental = supplementalClips.some(
    (clip) => clip.videoStatus === "processing",
  );
  const videoProcessing =
    expectsVideo &&
    !hasVideo &&
    (videoLoading || post.image.videoStatus === "processing");
  const videoFailed =
    expectsVideo && !hasVideo && post.image.videoStatus === "failed";

  const mediaAspect =
    (expectsVideo || isVertical) && post.image.aspectRatio
      ? videoAspectClasses[post.image.aspectRatio] ?? "aspect-[9/16] max-h-[480px]"
      : isVertical
        ? "aspect-[9/16] max-h-[480px]"
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
              {post.image.motionJobId
                ? `Rendering ${post.image.motionType ?? "influencer"} clip…`
                : post.contentType === "Reel"
                  ? "Generating Reel video…"
                  : "Generating video ad…"}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {post.image.motionJobId
                ? post.image.motionType === "talk"
                  ? "Muxing voice into video — usually 1–3 minutes"
                  : "Voice tracks appear below — video usually 1–3 minutes"
                : "Usually 1–3 minutes"}
            </p>
          </div>
        )}

        {videoFailed && !hasVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-900/50 backdrop-blur-sm">
            <p className="text-sm font-medium text-white">Video generation failed</p>
            <p className="mt-1 px-4 text-center text-xs text-rose-100">
              Try again, or publish the image version.
            </p>
          </div>
        )}
      </div>

      {post.image.audioUrl && !post.image.audioEmbeddedInVideo && (
        <MotionAudioBlock
          label={
            post.image.motionType
              ? `${post.image.motionType} voice`
              : "AI voiceover"
          }
          audioUrl={post.image.audioUrl}
          script={post.image.voiceoverScript}
        />
      )}

      {supplementalClips.map((clip, index) => (
        <SupplementalClipPreview
          key={clip.motionJobId ?? `${clip.motionType}-${index}`}
          clip={clip}
          index={index}
          videoLoading={videoLoading}
        />
      ))}

      {pendingSupplemental && videoLoading && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
          Additional motion clips still rendering…
        </div>
      )}

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

function MotionAudioBlock({
  label,
  audioUrl,
  script,
}: {
  label: string;
  audioUrl: string;
  script?: string;
}) {
  return (
    <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <audio
        src={audioUrl}
        controls
        preload="metadata"
        className="h-9 w-full"
      />
      {script && (
        <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
          &ldquo;{script}&rdquo;
        </p>
      )}
    </div>
  );
}

function SupplementalClipPreview({
  clip,
  index,
  videoLoading,
}: {
  clip: InfluencerMotionClip;
  index: number;
  videoLoading: boolean;
}) {
  const processing = clip.videoStatus === "processing";
  const failed = clip.videoStatus === "failed";

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
      <p className="mb-2 text-xs font-medium capitalize text-slate-500 dark:text-slate-400">
        Clip {index + 2}: {clip.motionType}
      </p>
      {clip.videoUrl ? (
        <video
          src={clip.videoUrl}
          controls
          playsInline
          className="aspect-[9/16] max-h-64 w-full rounded-lg bg-black object-cover"
        />
      ) : processing ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-6 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Spinner size="sm" />
          {videoLoading ? "Rendering…" : "Waiting…"}
        </div>
      ) : failed ? (
        <p className="text-xs text-rose-600">Clip failed to render</p>
      ) : null}
      {clip.audioUrl && (
        <div className="mt-2">
          <audio
            src={clip.audioUrl}
            controls
            preload="metadata"
            className="h-9 w-full"
          />
          {clip.voiceoverScript && (
            <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
              &ldquo;{clip.voiceoverScript}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}