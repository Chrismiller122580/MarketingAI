"use client";

import { useState } from "react";
import Image from "next/image";
import { useSite } from "@/context/site-context";
import { useSettings } from "@/context/settings-context";
import { usePosts } from "@/context/posts-context";
import type { Platform, SavedPost } from "@/lib/types";

const ALL_PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "pinterest", label: "Pinterest" },
];

export function CampaignPack() {
  const { site } = useSite();
  const { settings } = useSettings();
  const { savePack, savePost } = usePosts();
  const [prompt, setPrompt] = useState("");
  const [maxPosts, setMaxPosts] = useState(9);
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleGenerate() {
    if (!site) return;
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/generate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site,
          settings,
          prompt: prompt.trim(),
          platforms: settings.defaultPlatforms,
          maxPosts,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Batch generation failed");
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch generation failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSavePack() {
    if (!posts.length || !site) return;
    const name = `${site.brand.name} Campaign — ${new Date().toLocaleDateString()}`;
    const saved = posts.map((p) => savePost(p));
    savePack(name, saved);
    setSaved(true);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(posts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-pack-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          Campaign Pack Generator
        </h2>
        <p className="text-sm text-slate-500">
          Generate a full week of posts across platforms — each with matched
          images and scheduled dates.
        </p>
      </div>

      <div className="space-y-4 p-6">
        {!site ? (
          <p className="text-sm text-amber-700">
            Crawl a domain first to generate a campaign pack.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Posts to generate
                </label>
                <select
                  value={maxPosts}
                  onChange={(e) => setMaxPosts(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {[3, 6, 9, 12, 15].map((n) => (
                    <option key={n} value={n}>
                      {n} posts
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Platforms
                </label>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {settings.defaultPlatforms
                    .map(
                      (p) =>
                        ALL_PLATFORMS.find((ap) => ap.value === p)?.label ?? p,
                    )
                    .join(", ")}{" "}
                  <span className="text-slate-400">(change in Settings)</span>
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Campaign theme (optional)
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. product launch, summer sale, thought leadership"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading
                ? `Generating ${maxPosts} posts…`
                : `Generate ${maxPosts}-post campaign pack`}
            </button>
          </>
        )}

        {posts.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSavePack}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {saved ? "Saved to library ✓" : "Save pack to library"}
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Export JSON
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="overflow-hidden rounded-lg border border-slate-200"
                >
                  <div className="relative aspect-video bg-slate-100">
                    <Image
                      src={post.image.url}
                      alt={post.image.alt}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium capitalize text-indigo-600">
                        {post.platform}
                      </span>
                      {post.scheduledFor && (
                        <span className="text-xs text-slate-400">
                          {post.scheduledFor}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                      {post.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}