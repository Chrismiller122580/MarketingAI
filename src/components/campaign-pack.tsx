"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";
import { useSettings } from "@/context/settings-context";
import { usePosts } from "@/context/posts-context";
import type { Platform, SavedPost, VisualTargeting } from "@/lib/types";
import { DEFAULT_VISUAL_TARGETING } from "@/lib/visual-targeting";
import { VisualTargetingPicker } from "./visual-targeting-picker";
import { LoadingOverlay } from "./loading-indicator";

const ALL_PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "pinterest", label: "Pinterest" },
  { value: "email", label: "Email" },
];

export function CampaignPack() {
  const { data: session } = useSession();
  const { site } = useSite();
  const { settings } = useSettings();
  const { savePack, savePost } = usePosts();

  const su = (session?.user ?? {}) as Record<string, unknown>;
  const userPlan = (su.plan as string) || "free";
  const endsAtRaw = su.subscriptionEndsAt;
  const isPaid = userPlan !== "free" && (!endsAtRaw || (() => { try { return new Date(endsAtRaw as any) > new Date(); } catch { return false; } })());

  const [prompt, setPrompt] = useState("");
  const [maxPosts, setMaxPosts] = useState(9);
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [visualTargeting, setVisualTargeting] =
    useState<VisualTargeting>(DEFAULT_VISUAL_TARGETING);

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
          preferAiImage: settings.preferAiImages,
          visualTargeting: settings.preferAiImages ? visualTargeting : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 402 || data?.code === "SUBSCRIPTION_REQUIRED") {
          throw new Error(data.error || "Paid subscription required. Upgrade at /billing.");
        }
        throw new Error(data.error ?? "Batch generation failed");
      }
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePack() {
    if (!posts.length || !site) return;
    const name = `${site.brand.name} Campaign — ${new Date().toLocaleDateString()}`;
    const saved = await Promise.all(posts.map((p) => savePost(p)));
    await savePack(name, saved);
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
    <>
    <LoadingOverlay
      show={loading}
      label={`Generating ${maxPosts}-post campaign pack…`}
      sublabel="Smart-matching pages, business context, and dual AI copy"
      progress={{ current: 0, total: maxPosts }}
    />
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Campaign Pack Generator
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Posts to generate
                </label>
                <select
                  value={maxPosts}
                  onChange={(e) => setMaxPosts(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"
                >
                  {[3, 6, 9, 12, 15].map((n) => (
                    <option key={n} value={n}>
                      {n} posts
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Platforms
                </label>
                <p className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  {settings.defaultPlatforms
                    .map(
                      (p) =>
                        ALL_PLATFORMS.find((ap) => ap.value === p)?.label ?? p,
                    )
                    .join(", ")}{" "}
                  <span className="text-slate-400 dark:text-slate-500">(change in Settings)</span>
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Campaign theme (optional)
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. product launch, summer sale, thought leadership"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"
              />
            </div>

            {settings.preferAiImages && (
              <VisualTargetingPicker
                value={visualTargeting}
                onChange={setVisualTargeting}
                compact
              />
            )}

            {!isPaid && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Campaign packs require an active Pro or Enterprise plan.{" "}
                <a href="/billing" className="font-semibold underline">Upgrade now</a>
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !isPaid}
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
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
                className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Export JSON
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
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
                      <span className="text-xs font-medium capitalize text-amber-600">
                        {post.platform}
                      </span>
                      {post.scheduledFor && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {post.scheduledFor}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-600 dark:text-slate-300">
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
    </>
  );
}