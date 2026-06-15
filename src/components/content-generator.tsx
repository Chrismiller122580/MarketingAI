"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";
import { useSettings } from "@/context/settings-context";
import { usePosts } from "@/context/posts-context";
import { PostPreview } from "./post-preview";
import { BrandInsights } from "./brand-insights";
import { PublishPanel } from "./publish-panel";
import type { ContentType, GeneratedPost, Platform, SavedPost } from "@/lib/types";

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
];

export function ContentGenerator() {
  const { data: session } = useSession();
  const { site } = useSite();
  const { settings } = useSettings();
  const { savePost, updatePostMedia } = usePosts();

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVideoAd = contentType === "Video Ad";

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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

    try {
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
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            AI Content Studio
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {site
              ? `Smart copy + ${isVideoAd ? "video ads" : "images"} from ${site.pages.length} pages and ${site.images.length} images`
              : "Crawl a domain to unlock intelligent content generation"}
          </p>
        </div>

        <div className="space-y-4 p-6">
          {!site && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Enter a domain above to analyze your site and generate posts with
              matched images.
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

      {post && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(post.text)}
            className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Copy caption
          </button>
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