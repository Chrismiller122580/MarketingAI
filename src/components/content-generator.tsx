"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { UserRound, X } from "lucide-react";
import { useSite } from "@/context/site-context";
import { useSettings } from "@/context/settings-context";
import { usePosts } from "@/context/posts-context";
import { PostPreview } from "./post-preview";
import { BrandInsights } from "./brand-insights";
import { PublishPanel } from "./publish-panel";
import { AiVariantPicker } from "./ai-variant-picker";
import { LoadingOverlay } from "./loading-indicator";
import type {
  AiProvider,
  ContentAngle,
  ContentType,
  GeneratedPost,
  Platform,
  SavedPost,
  StoryMedia,
  VisualTargeting,
} from "@/lib/types";
import { suggestVisualTargeting } from "@/lib/business-context";
import {
  isInstagramFormat,
  isVideoContentType,
  triggersVideoGeneration,
} from "@/lib/content-formats";
import { DEFAULT_VISUAL_TARGETING } from "@/lib/visual-targeting";
import { ENTERPRISE_PLUS_LABEL, isEnterprisePlusPlan } from "@/lib/plans";
import { ContentAnglePicker } from "./content-angle-picker";
import { VisualTargetingPicker } from "./visual-targeting-picker";

type AttachedInfluencer = {
  id: string;
  displayName: string;
  handle: string;
  portraitUrl?: string;
  motionVideoUrl?: string;
  hasMotionClip: boolean;
};

const VisualPostEditor = dynamic(
  () =>
    import("./visual-post-editor").then((m) => m.VisualPostEditor),
  { ssr: false },
);

const contentTypes: ContentType[] = [
  "Social Post",
  "Reel",
  "Story",
  "Email Copy",
  "Ad Headline",
  "Blog Intro",
  "Product Description",
  "Video Ad",
];

type AiCapabilities = {
  aiImageAvailable: boolean;
  aiVideoAvailable: boolean;
  aiVoiceAvailable: boolean;
  aiImageProvider: "openai" | "xai" | null;
  aiVideoProvider: "replicate" | null;
  aiVoiceProvider: "elevenlabs" | null;
};

const platforms: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "pinterest", label: "Pinterest" },
  { value: "email", label: "Email" },
];

export function ContentGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { site, loadSavedSite } = useSite();
  const { settings } = useSettings();
  const { posts, savePost, updatePostMedia } = usePosts();

  const su = (session?.user ?? {}) as Record<string, unknown>;
  const userPlan = (su.plan as string) || "free";
  const isAdmin = su.role === "admin";
  const hasEnterprisePlus = isAdmin || isEnterprisePlusPlan(userPlan);
  const endsAtRaw = su.subscriptionEndsAt;
  const isPaid = userPlan !== "free" && (!endsAtRaw || (() => { try { return new Date(endsAtRaw as any) > new Date(); } catch { return false; } })());

  const [savedPost, setSavedPost] = useState<SavedPost | null>(null);
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("Social Post");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [selectedPage, setSelectedPage] = useState("all");
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferAiImage, setPreferAiImage] = useState(settings.preferAiImages);
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5);
  const [visualTargeting, setVisualTargeting] =
    useState<VisualTargeting>(DEFAULT_VISUAL_TARGETING);
  const [loadingStage, setLoadingStage] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [contentAngle, setContentAngle] = useState<ContentAngle>("auto");
  const [storyMedia, setStoryMedia] = useState<StoryMedia>("image");
  const [aiCaps, setAiCaps] = useState<AiCapabilities | null>(null);
  const [attachedInfluencer, setAttachedInfluencer] =
    useState<AttachedInfluencer | null>(null);
  const [useInfluencerPortrait, setUseInfluencerPortrait] = useState(true);
  const [useInfluencerMotion, setUseInfluencerMotion] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const postHistory = posts.map((p) => ({
    text: p.text,
    sourcePage: p.sourcePage,
    platform: p.platform,
  }));

  const isVideoContent = isVideoContentType(contentType);
  const isReel = contentType === "Reel";
  const isStory = contentType === "Story";
  const isStoryVideo = isStory && storyMedia === "video";
  const willGenerateVideo = triggersVideoGeneration(contentType, storyMedia);
  const usesAiVisuals = isVideoContent || isStory || preferAiImage;

  const missingProvider =
    (isReel && !aiCaps?.aiVideoAvailable) ||
    (isStory && storyMedia === "image" && !aiCaps?.aiImageAvailable) ||
    (isStoryVideo && !aiCaps?.aiVideoAvailable);

  useEffect(() => {
    fetch("/api/social/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setAiCaps({
          aiImageAvailable: !!data.aiImageAvailable,
          aiVideoAvailable: !!data.aiVideoAvailable,
          aiVoiceAvailable: !!data.aiVoiceAvailable,
          aiImageProvider: data.aiImageProvider ?? null,
          aiVideoProvider: data.aiVideoProvider ?? null,
          aiVoiceProvider: data.aiVoiceProvider ?? null,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "video") {
      Promise.resolve().then(() => setContentType("Video Ad"));
    } else if (type === "reel") {
      Promise.resolve().then(() => {
        setContentType("Reel");
        setPlatform("instagram");
      });
    } else if (type === "story") {
      Promise.resolve().then(() => {
        setContentType("Story");
        setPlatform("instagram");
      });
    } else if (type === "reels-stories") {
      Promise.resolve().then(() => {
        setContentType("Reel");
        setPlatform("instagram");
      });
    }
    const angle = searchParams.get("angle");
    if (angle) {
      Promise.resolve().then(() => setContentAngle(angle as ContentAngle));
    }
  }, [searchParams]);

  useEffect(() => {
    const influencerId = searchParams.get("influencer");
    if (!influencerId) {
      Promise.resolve().then(() => setAttachedInfluencer(null));
      return;
    }

    let cancelled = false;
    fetch("/api/creator-studio/influencers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: {
        influencers?: Array<{
          id: string;
          persona?: { displayName?: string; handle?: string };
          assets?: {
            portraitUrl?: string;
            videoUrl?: string;
            motionStatus?: string;
          };
        }>;
      } | null) => {
        if (cancelled || !data?.influencers) return;
        const match = data.influencers.find((i) => i.id === influencerId);
        if (!match) return;
        const persona = match.persona ?? {};
        const hasMotionClip =
          match.assets?.motionStatus === "ready" && !!match.assets?.videoUrl;
        setAttachedInfluencer({
          id: match.id,
          displayName: persona.displayName ?? "Influencer",
          handle: persona.handle ?? "creator",
          portraitUrl: match.assets?.portraitUrl,
          motionVideoUrl: match.assets?.videoUrl,
          hasMotionClip,
        });
        setUseInfluencerPortrait(true);
        setUseInfluencerMotion(hasMotionClip);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    const domainParam = searchParams.get("domain");
    if (domainParam && site?.domain !== domainParam) {
      void loadSavedSite(domainParam);
    }
  }, [searchParams, site?.domain, loadSavedSite]);

  useEffect(() => {
    const pageParam = searchParams.get("page");
    if (!pageParam || !site) return;
    const match =
      site.pages.find((p) => p.path === pageParam) ??
      site.pages.find((p) => p.url === pageParam);
    if (match) {
      Promise.resolve().then(() => setSelectedPage(match.url));
    }
  }, [searchParams, site]);

  function detachInfluencer() {
    setAttachedInfluencer(null);
    setUseInfluencerPortrait(true);
    setUseInfluencerMotion(true);
    router.replace("/content");
  }

  useEffect(() => {
    if (isInstagramFormat(contentType)) {
      Promise.resolve().then(() => setPlatform("instagram"));
    }
  }, [contentType]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!site) return;
    Promise.resolve().then(() =>
      setVisualTargeting((prev) =>
        suggestVisualTargeting(site.brand, platform, prev),
      ),
    );
  }, [site, platform]);

  async function pollVideoStatus(
    jobId: string,
    currentPost: GeneratedPost,
    saved: SavedPost,
  ) {
    setVideoLoading(true);

    const poll = async () => {
      try {
        const res = await fetch(`/api/video/status/${jobId}`);
        const data = await res.json();

        if (data.status === "ready" && data.videoUrl) {
          const updatedImage = {
            ...currentPost.image,
            videoUrl: data.videoUrl,
            videoStatus: "ready" as const,
          };
          const updatedPost = { ...currentPost, image: updatedImage };
          setPost(updatedPost);
          setVideoLoading(false);
          if (pollRef.current) clearInterval(pollRef.current);

          try {
            const updated = await updatePostMedia(saved.id, updatedImage);
            setSavedPost(updated);
          } catch {
            /* preview still shows video */
          }
        } else if (data.status === "failed") {
          const updatedImage = {
            ...currentPost.image,
            videoStatus: "failed" as const,
          };
          setPost({ ...currentPost, image: updatedImage });
          setError(data.error ?? "Video generation failed");
          setVideoLoading(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* keep polling */
      }
    };

    await poll();
    pollRef.current = setInterval(poll, 4000);
  }

  async function handleGenerate() {
    if (!site) return;

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    setLoading(true);
    setVideoLoading(false);
    setError(null);
    setLoadingStage(
      isVideoContent
        ? isReel
          ? "Crafting Reel hook and vertical video…"
          : "Crafting video script and visuals…"
        : isStory
          ? "Designing Story visual and swipe-up copy…"
          : "Analyzing business model and matching pages…",
    );

    try {
      setTimeout(() => {
        setLoadingStage((s) =>
          s.includes("Analyzing")
            ? "Comparing GPT and Grok for best copy…"
            : s,
        );
      }, 1200);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site,
          settings,
          contentType,
          platform,
          prompt: prompt.trim(),
          sourcePageUrl: selectedPage === "all" ? undefined : selectedPage,
          preferAiImage: isVideoContent || isStory ? true : preferAiImage,
          videoDuration: willGenerateVideo ? videoDuration : undefined,
          storyMedia: isStory ? storyMedia : undefined,
          visualTargeting: usesAiVisuals ? visualTargeting : undefined,
          contentAngle,
          existingPosts: postHistory,
          influencerId: attachedInfluencer?.id,
          useInfluencerPortrait: attachedInfluencer
            ? useInfluencerPortrait
            : undefined,
          useInfluencerMotion: attachedInfluencer?.hasMotionClip
            ? useInfluencerMotion
            : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 402 || data?.code === "SUBSCRIPTION_REQUIRED") {
          throw new Error(data.error || "Paid subscription required. Upgrade at /billing.");
        }
        throw new Error(data.error ?? "Generation failed");
      }

      const generated = data as GeneratedPost;
      setPost(generated);

      try {
        const saved = await savePost(generated);
        setSavedPost(saved);

        if (
          willGenerateVideo &&
          generated.image.videoJobId &&
          generated.image.videoStatus === "processing"
        ) {
          pollVideoStatus(generated.image.videoJobId, generated, saved);
        } else if (isStory && storyMedia === "image") {
          setEditorOpen(true);
        }
      } catch {
        /* preview still shown */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  }

  function handleVisualSave(image: GeneratedPost["image"]) {
    if (!post) return;
    const updated = { ...post, image };
    setPost(updated);
    if (savedPost) {
      const next = { ...savedPost, image };
      setSavedPost(next);
      updatePostMedia(savedPost.id, image).catch(() => {});
    }
  }

  function handleVariantSelect(provider: AiProvider, text: string) {
    if (!post) return;
    const updated = {
      ...post,
      text,
      selectedProvider: provider,
      characterCount: text.length,
    };
    setPost(updated);
    if (savedPost) {
      const next = { ...savedPost, ...updated };
      setSavedPost(next);
      fetch(`/api/db/posts/${savedPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          selectedProvider: provider,
          aiVariants: post.aiVariants,
        }),
      }).catch(() => {});
    }
  }

  return (
    <div className="space-y-6">
      <LoadingOverlay
        show={loading}
        label={loadingStage || "Generating content…"}
        sublabel={
          isVideoContent
            ? isReel
              ? "Building Reel caption, cover, and vertical video render"
              : "Building script, image, and starting video render"
            : isStory
              ? "Creating full-screen Story visual and short copy"
              : "Smart-matching pages, visuals, and dual AI copy"
        }
      />
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            AI Content Studio
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {site
              ? site.brand.businessModel
                ? `${site.brand.businessModel.type.toUpperCase()} · ${site.brand.businessModel.market.toUpperCase()} — smart copy + ${isVideoContent ? "vertical video" : isStory ? "Stories" : "images"} from ${site.pages.length} pages`
                : `Smart copy + ${isVideoContent ? "vertical video" : isStory ? "Stories" : "images"} from ${site.pages.length} pages and ${site.images.length} images`
              : "Crawl a domain to unlock intelligent content generation"}
          </p>
        </div>

        <div className="space-y-4 p-6">
          {!site && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Enter a domain above to analyze your site. Then choose{" "}
              <strong>Reel</strong> or <strong>Story</strong> for Instagram
              vertical formats, or <strong>Video Ad</strong> for short AI video
              ads (5–10 seconds).
            </div>
          )}

          {site && attachedInfluencer && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/70 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {attachedInfluencer.portraitUrl ? (
                    <img
                      src={attachedInfluencer.portraitUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-violet-200 dark:ring-violet-800"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
                      <UserRound className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Linked from Creator Studio
                    </p>
                    <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                      {attachedInfluencer.displayName} · @
                      {attachedInfluencer.handle}
                    </p>
                    {hasEnterprisePlus ? (
                      <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
                        {ENTERPRISE_PLUS_LABEL}: fact-locked influencer copy from
                        crawled pages.
                        {willGenerateVideo && aiCaps?.aiVoiceAvailable
                          ? " Reel voiceover uses the influencer’s ElevenLabs voice when set."
                          : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Standard site copy — upgrade to {ENTERPRISE_PLUS_LABEL}{" "}
                        for influencer voice with locked facts.{" "}
                        <Link href="/billing" className="underline">
                          Upgrade
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={detachInfluencer}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Detach influencer"
                >
                  <X className="h-3.5 w-3.5" />
                  Detach
                </button>
              </div>
              {!isVideoContent && !isStory && (
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useInfluencerPortrait}
                      onChange={(e) => setUseInfluencerPortrait(e.target.checked)}
                      className="rounded border-slate-300 text-violet-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Use influencer visual (uncheck for site or AI image)
                    </span>
                  </label>
                  {attachedInfluencer.hasMotionClip && useInfluencerPortrait && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useInfluencerMotion}
                        onChange={(e) => setUseInfluencerMotion(e.target.checked)}
                        className="rounded border-slate-300 text-violet-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Use motion clip (talk / wave / walk) instead of still
                        portrait
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {site && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="platform"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Platform
                  </label>
                  <select
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    disabled={isInstagramFormat(contentType)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {platforms.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="content-type"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Content type
                  </label>
                  <select
                    id="content-type"
                    value={contentType}
                    onChange={(e) =>
                      setContentType(e.target.value as ContentType)
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  >
                    {contentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="source-page"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Source page
                </label>
                <select
                  id="source-page"
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
                >
                  <option value="all">Best matching page (AI picks)</option>
                  {site.pages.map((page) => (
                    <option key={page.url} value={page.url}>
                      {page.path} — {page.title}
                      {page.images.length > 0
                        ? ` (${page.images.length} images)`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {site && isInstagramFormat(contentType) && (
            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 px-4 py-3 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/20">
              <p className="text-xs text-fuchsia-900 dark:text-fuchsia-200">
                {isReel
                  ? "Reels — 9:16 vertical video with hook-first captions."
                  : "Stories — full-screen 9:16 format with swipe-up copy."}
              </p>
              {aiCaps && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {isReel && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        aiCaps.aiVideoAvailable
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      }`}
                    >
                      Video: {aiCaps.aiVideoAvailable ? "Replicate ready" : "Replicate not configured"}
                    </span>
                  )}
                  {isStory && storyMedia === "image" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        aiCaps.aiImageAvailable
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      }`}
                    >
                      Images:{" "}
                      {aiCaps.aiImageAvailable
                        ? `${aiCaps.aiImageProvider === "openai" ? "OpenAI" : "xAI"} ready`
                        : "No image provider"}
                    </span>
                  )}
                  {isStoryVideo && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        aiCaps.aiVideoAvailable
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      }`}
                    >
                      Video: {aiCaps.aiVideoAvailable ? "Replicate ready" : "Replicate not configured"}
                    </span>
                  )}
                  {willGenerateVideo && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        aiCaps.aiVoiceAvailable
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      Voice: {aiCaps.aiVoiceAvailable ? "ElevenLabs ready" : "Optional — add ELEVENLABS_API_KEY"}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {site && isStory && (
            <div>
              <label
                htmlFor="story-media"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Story format
              </label>
              <select
                id="story-media"
                value={storyMedia}
                onChange={(e) => setStoryMedia(e.target.value as StoryMedia)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                <option value="image">Image Story (OpenAI / xAI)</option>
                <option value="video">Video Story (Replicate)</option>
              </select>
            </div>
          )}

          {site && willGenerateVideo && (
            <div>
              <label
                htmlFor="video-duration"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Video duration
              </label>
              <select
                id="video-duration"
                value={videoDuration}
                onChange={(e) =>
                  setVideoDuration(Number(e.target.value) as 5 | 10)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {aiCaps?.aiVideoAvailable
                  ? `Replicate is connected — video render usually takes 1–3 minutes.${
                      aiCaps.aiVoiceAvailable
                        ? " ElevenLabs will narrate your hook as an MP3 voiceover."
                        : ""
                    }`
                  : "Add REPLICATE_API_TOKEN in Settings → Integrations to enable video."}
              </p>
            </div>
          )}

          {site &&
            !isVideoContent &&
            !isStory &&
            (!attachedInfluencer || !useInfluencerPortrait) && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferAiImage}
                onChange={(e) => setPreferAiImage(e.target.checked)}
                className="rounded border-slate-300 text-amber-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Generate AI image (DALL-E / Grok) instead of site photo
              </span>
            </label>
          )}

          {site && usesAiVisuals && (
            <VisualTargetingPicker
              value={visualTargeting}
              onChange={setVisualTargeting}
            />
          )}

          {site && !isVideoContent && (
            <>
              <ContentAnglePicker
                value={contentAngle}
                onChange={setContentAngle}
              />
              {postHistory.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Avoiding repetition across {postHistory.length} post
                  {postHistory.length === 1 ? "" : "s"} in your library.
                </p>
              )}
            </>
          )}

          <div>
            <label
              htmlFor="prompt"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Campaign brief (optional)
            </label>
            <textarea
              id="prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Target audience, promotion, seasonal angle, tone tweaks..."
              className="w-full resize-none rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {!isPaid && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Crawl and content generation require an active Pro or Enterprise plan.{" "}
              <a href="/billing" className="font-semibold underline">Upgrade now</a>
            </div>
          )}

          {missingProvider && (
            <p className="text-sm text-rose-600">
              {isReel || isStoryVideo
                ? "Replicate is required for video. Add REPLICATE_API_TOKEN in Settings → Integrations."
                : "OpenAI or xAI is required for Story images. Add OPENAI_API_KEY or XAI_API_KEY in Settings → Integrations."}
            </p>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!site || loading || !isPaid || missingProvider}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? willGenerateVideo
                ? isReel
                  ? "Generating Reel + starting video…"
                  : isStoryVideo
                    ? "Generating Story + starting video…"
                    : "Generating caption + starting video…"
                : isStory
                  ? "Generating Story visual…"
                  : "Generating post + image…"
              : isReel
                ? "Generate Reel"
                : isStory
                  ? isStoryVideo
                    ? "Generate video Story"
                    : "Generate image Story"
                  : isVideoContent
                    ? "Generate video ad"
                    : "Generate post with image"}
          </button>
        </div>
      </div>

      {post?.aiVariants && post.aiVariants.length > 1 && (
        <AiVariantPicker
          variants={post.aiVariants}
          selected={post.selectedProvider ?? post.aiVariants[0].provider}
          recommendation={post.aiRecommendation}
          onSelect={handleVariantSelect}
        />
      )}

      {post && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PostPreview post={post} videoLoading={videoLoading} />
          <BrandInsights post={post} />
        </div>
      )}

      {savedPost && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Publish
          </h3>
          <PublishPanel post={savedPost} />
        </div>
      )}

      {editorOpen && savedPost && site && (
        <VisualPostEditor
          post={post ?? savedPost}
          postId={savedPost.id}
          brandName={site.brand.name}
          themeColor={site.brand.themeColor}
          onSave={handleVisualSave}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {post && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(post.text)}
            className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Copy caption
          </button>
          {!post.image.videoUrl && !willGenerateVideo && savedPost && (
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="rounded-lg bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              Customize visual
            </button>
          )}
          {post.image.videoUrl ? (
            <a
              href={post.image.videoUrl}
              download={`${site?.brand.name ?? "video-ad"}-${post.platform}.mp4`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Download video
            </a>
          ) : null}
          {post.image.audioUrl ? (
            <a
              href={post.image.audioUrl}
              download={`${site?.brand.name ?? "voiceover"}-${post.platform}.mp3`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Download voiceover
            </a>
          ) : null}
          {!post.image.videoUrl ? (
            <a
              href={post.image.url}
              download={`${site?.brand.name ?? "post"}-${post.platform}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Download image
            </a>
          ) : null}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || videoLoading || !isPaid}
            className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            Regenerate
          </button>
          <span className="ml-2 self-center text-xs text-emerald-600">Saved to library</span>
        </div>
      )}
    </div>
  );
}