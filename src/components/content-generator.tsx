"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
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
  VisualTargeting,
} from "@/lib/types";
import { suggestVisualTargeting } from "@/lib/business-context";
import { DEFAULT_VISUAL_TARGETING } from "@/lib/visual-targeting";
import { ContentAnglePicker } from "./content-angle-picker";
import { VisualTargetingPicker } from "./visual-targeting-picker";

const VisualPostEditor = dynamic(
  () =>
    import("./visual-post-editor").then((m) => m.VisualPostEditor),
  { ssr: false },
);

const contentTypes: ContentType[] = [
  "Social Post",
  "Email Copy",
  "Ad Headline",
  "Blog Intro",
  "Product Description",
  "Video Ad",
];

const platforms: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "pinterest", label: "Pinterest" },
  { value: "email", label: "Email" },
];

export function ContentGenerator() {
  const { data: session } = useSession();
  const { site } = useSite();
  const { settings } = useSettings();
  const { posts, savePost, updatePostMedia } = usePosts();

  const su = (session?.user ?? {}) as Record<string, unknown>;
  const userPlan = (su.plan as string) || "free";
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const postHistory = posts.map((p) => ({
    text: p.text,
    sourcePage: p.sourcePage,
    platform: p.platform,
  }));

  const isVideoAd = contentType === "Video Ad";
  const usesAiVisuals = isVideoAd || preferAiImage;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("type") === "video") {
      setContentType("Video Ad");
    }
    const angle = params.get("angle");
    if (angle) {
      setContentAngle(angle as ContentAngle);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!site) return;
    setVisualTargeting((prev) =>
      suggestVisualTargeting(site.brand, platform, prev),
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
      isVideoAd
        ? "Crafting video script and visuals…"
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
          preferAiImage: isVideoAd ? true : preferAiImage,
          videoDuration: isVideoAd ? videoDuration : undefined,
          visualTargeting: usesAiVisuals ? visualTargeting : undefined,
          contentAngle,
          existingPosts: postHistory,
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
          isVideoAd &&
          generated.image.videoJobId &&
          generated.image.videoStatus === "processing"
        ) {
          pollVideoStatus(generated.image.videoJobId, generated, saved);
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
          isVideoAd
            ? "Building script, image, and starting video render"
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
                ? `${site.brand.businessModel.type.toUpperCase()} · ${site.brand.businessModel.market.toUpperCase()} — smart copy + ${isVideoAd ? "video ads" : "images"} from ${site.pages.length} pages`
                : `Smart copy + ${isVideoAd ? "video ads" : "images"} from ${site.pages.length} pages and ${site.images.length} images`
              : "Crawl a domain to unlock intelligent content generation"}
          </p>
        </div>

        <div className="space-y-4 p-6">
          {!site && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Enter a domain above to analyze your site. Then choose{" "}
              <strong>Video Ad</strong> under Content type to generate short AI
              video ads (5–10 seconds).
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
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
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

          {site && isVideoAd && (
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
                Requires REPLICATE_API_TOKEN. Video generation takes 1–3 minutes.
              </p>
            </div>
          )}

          {site && !isVideoAd && (
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

          {site && !isVideoAd && (
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

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!site || loading || !isPaid}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? isVideoAd
                ? "Generating caption + starting video…"
                : "Generating post + image…"
              : isVideoAd
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
          {!post.image.videoUrl && !isVideoAd && savedPost && (
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
          ) : (
            <a
              href={post.image.url}
              download={`${site?.brand.name ?? "post"}-${post.platform}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Download image
            </a>
          )}
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