"use client";

import { useState } from "react";
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
];

const platforms: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "pinterest", label: "Pinterest" },
];

export function ContentGenerator() {
  const { site } = useSite();
  const { settings } = useSettings();
  const { savePost } = usePosts();
  const [savedPost, setSavedPost] = useState<SavedPost | null>(null);
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("Social Post");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [selectedPage, setSelectedPage] = useState("all");
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [preferAiImage, setPreferAiImage] = useState(settings.preferAiImages);

  async function handleGenerate() {
    if (!site) return;

    setLoading(true);
    setError(null);
    setSaved(false);

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
          preferAiImage,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed");

      setPost(data as GeneratedPost);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!post) return;
    const saved = await savePost(post);
    setSavedPost(saved);
    setSaved(true);
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
              ? `Smart copy + images from ${site.pages.length} pages and ${site.images.length} images`
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

          {site && (
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

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!site || loading}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating post + image…" : "Generate post with image"}
          </button>
        </div>
      </div>

      {post && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PostPreview post={post} />
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
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {saved ? "Saved ✓" : "Save to library"}
          </button>
          <a
            href={post.image.url}
            download={`${site?.brand.name ?? "post"}-${post.platform}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Download image
          </a>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}