"use client";

import { useEffect, useMemo, useState } from "react";
import { planItemToPrompt } from "@/lib/campaign-planner";
import { pickFreshAngle } from "@/lib/content-uniqueness";
import type { GeneratedPost } from "@/lib/types";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";
import { useSettings } from "@/context/settings-context";
import { usePosts } from "@/context/posts-context";
import type { ContentAngle, Platform, SavedPost, VisualTargeting } from "@/lib/types";
import { suggestVisualTargeting } from "@/lib/business-context";
import { DEFAULT_VISUAL_TARGETING } from "@/lib/visual-targeting";
import { ContentAnglePicker } from "./content-angle-picker";
import { VisualTargetingPicker } from "./visual-targeting-picker";
import { LoadingOverlay } from "./loading-indicator";
import { CrawledPagesFilter } from "./crawled-pages-filter";
import { recommendSourcePage } from "@/lib/crawled-page-utils";

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
  const { posts: libraryPosts, savePack, savePost } = usePosts();

  const user = session?.user;
  const userPlan = user?.plan || "free";
  const endsAtRaw = user?.subscriptionEndsAt;
  const [now] = useState(() => Date.now());

  const isPaid = useMemo(() => {
    if (userPlan === "free") return false;
    if (!endsAtRaw) return true;
    try {
      const d = new Date(String(endsAtRaw));
      if (Number.isNaN(d.getTime())) return false;
      return d.getTime() > now;
    } catch {
      return false;
    }
  }, [userPlan, endsAtRaw, now]);

  const [prompt, setPrompt] = useState("");
  const [maxPosts, setMaxPosts] = useState(9);
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [planInfo, setPlanInfo] = useState<{ theme: string; source: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [preferAiImage, setPreferAiImage] = useState(settings.preferAiImages);
  const [visualTargeting, setVisualTargeting] =
    useState<VisualTargeting>(DEFAULT_VISUAL_TARGETING);
  const [contentAngle, setContentAngle] = useState<ContentAngle>("auto");
  const [varyAngles, setVaryAngles] = useState(true);
  const [focusPagePaths, setFocusPagePaths] = useState<string[]>([]);

  const primaryPlatform = settings.defaultPlatforms[0] ?? "instagram";
  const postHistory = libraryPosts.map((p) => ({
    text: p.text,
    sourcePage: p.sourcePage,
    platform: p.platform,
  }));

  useEffect(() => {
    Promise.resolve().then(() => {
      setPreferAiImage(settings.preferAiImages);
    });
  }, [settings.preferAiImages]);

  useEffect(() => {
    if (!site) return;
    Promise.resolve().then(() => {
      setVisualTargeting((prev) =>
        suggestVisualTargeting(site.brand, primaryPlatform, prev),
      );
    });
  }, [site, primaryPlatform]);

  // Simulated progress for long-running campaign generation (real progress would require streaming)
  useEffect(() => {
    if (!loading) {
      Promise.resolve().then(() => setLoadingProgress(0));
      return;
    }
    Promise.resolve().then(() => setLoadingProgress(1));
    const interval = setInterval(() => {
      setLoadingProgress((p) => {
        const next = p + (p < maxPosts * 0.7 ? 1 : 0.3);
        return Math.min(maxPosts, Math.floor(next));
      });
    }, 900);
    return () => clearInterval(interval);
  }, [loading, maxPosts]);

  async function handleGenerate() {
    if (!site) return;
    if (!settings.defaultPlatforms || settings.defaultPlatforms.length === 0) {
      setError("Select at least one default platform in Settings to generate a campaign pack.");
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(false);
    setPlanInfo(null);
    setPosts([]);
    setLoadingProgress(0);

    const accumulatedHistory = [...postHistory];
    const generated: SavedPost[] = [];

    try {
      // Step 1: Get the campaign plan (real planning on server)
      const planRes = await fetch("/api/generate/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site,
          settings,
          prompt: prompt.trim(),
          platforms: settings.defaultPlatforms,
          maxPosts,
          contentAngle,
          existingPosts: postHistory,
          varyAngles,
          focusPagePaths:
            focusPagePaths.length > 0 ? focusPagePaths : undefined,
        }),
      });

      const planData = await planRes.json();
      if (!planRes.ok) {
        if (planRes.status === 402 || planData?.code === "SUBSCRIPTION_REQUIRED") {
          throw new Error(planData.error || "Paid subscription required. Upgrade at /billing.");
        }
        throw new Error(planData.error ?? "Failed to plan campaign");
      }

      const p = planData.plan;
      const items = planData.items ?? [];
      setPlanInfo(p);

      // Step 2: Generate posts one-by-one for real progress + live UI updates
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setLoadingProgress(i + 1);

        const page = site.pages.find((pp) => pp.path === item.pagePath);
        if (!page) continue;

        const thisAngle = varyAngles
          ? pickFreshAngle(accumulatedHistory, i, contentAngle)
          : contentAngle ?? "auto";

        const itemPrompt = planItemToPrompt(item, prompt.trim());

        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            site,
            settings,
            contentType: "Social Post",
            platform: item.platform,
            prompt: itemPrompt,
            sourcePageUrl: page.url,
            preferAiImage: preferAiImage,
            visualTargeting: preferAiImage ? visualTargeting : undefined,
            contentAngle: thisAngle,
            existingPosts: accumulatedHistory,
          }),
        });

        const genData = await genRes.json();
        if (!genRes.ok) {
          if (genRes.status === 402 || genData?.code === "SUBSCRIPTION_REQUIRED") {
            throw new Error(genData.error || "Paid subscription required. Upgrade at /billing.");
          }
          // continue on single post failure to not lose the whole pack
          console.warn("Single post generation failed in pack:", genData.error);
          continue;
        }

        const post = genData as GeneratedPost;

        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() + item.dayOffset);

        const campaignPost: SavedPost = {
          ...post,
          id: `temp-${Date.now()}-${i}`,
          createdAt: new Date().toISOString(),
          scheduledFor: scheduled.toISOString().split("T")[0],
          insights: [
            `Campaign: ${p.theme} (${p.source === "ai" ? "AI-planned" : "smart calendar"}).`,
            `Angle: ${item.angle} on ${item.platform}.`,
            ...(post.insights ?? []),
          ],
        } as SavedPost;

        generated.push(campaignPost);
        // live update the grid
        setPosts([...generated]);

        // update history for next uniqueness/angle decisions
        accumulatedHistory.push({
          text: post.text,
          sourcePage: post.sourcePage,
          platform: post.platform,
        });
      }

      if (generated.length === 0) {
        throw new Error("No posts were generated. Try adjusting your settings or brief.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign generation failed");
    } finally {
      setLoading(false);
      // ensure progress shows complete
      setLoadingProgress(maxPosts);
    }
  }

  async function handleSavePack() {
    if (!posts.length || !site) return;
    setSaving(true);
    setError(null);
    try {
      const name = `${site.brand.name} Campaign — ${new Date().toLocaleDateString()}`;
      const savedPosts = await Promise.all(posts.map((p) => savePost(p)));
      await savePack(name, savedPosts);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pack to library");
    } finally {
      setSaving(false);
    }
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
      show={loading && posts.length === 0}
      label={`Generating ${maxPosts}-post campaign pack…`}
      sublabel="AI plans your calendar, then generates posts with matched pages and dual AI copy"
      progress={{ current: loadingProgress || 0, total: maxPosts }}
    />
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Campaign Pack Generator
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          AI plans a strategic content calendar, then generates posts with
          matched pages, images, and staggered schedule dates.
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

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferAiImage}
                onChange={(e) => setPreferAiImage(e.target.checked)}
                className="rounded border-slate-300 text-amber-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Generate AI images (DALL-E / Grok) instead of site photos
              </span>
            </label>

            {preferAiImage && (
              <VisualTargetingPicker
                value={visualTargeting}
                onChange={setVisualTargeting}
                compact
              />
            )}

            <ContentAnglePicker
              value={contentAngle}
              onChange={setContentAngle}
              compact
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={varyAngles}
                onChange={(e) => setVaryAngles(e.target.checked)}
                className="rounded border-slate-300 text-violet-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Vary creative angles across all posts in the pack
              </span>
            </label>

            <CrawledPagesFilter
              pages={site.pages}
              selectedPaths={focusPagePaths}
              onChange={setFocusPagePaths}
              recommendedPath={recommendSourcePage(site)?.path}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Campaign brief (optional)
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Target audience, promotion, seasonal angle, tone tweaks…"
                className="w-full resize-none rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

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
              disabled={loading || saving || !isPaid}
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
            {planInfo && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-sm">
                <span className="font-medium text-amber-800 dark:text-amber-200">Campaign theme:</span>{" "}
                <span className="text-amber-900 dark:text-amber-100">{planInfo.theme}</span>
                <span className="ml-2 text-amber-600 dark:text-amber-400 text-xs">({planInfo.source === "ai" ? "AI planned" : "heuristic"})</span>
              </div>
            )}

            {loading && posts.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-2 text-sm dark:bg-slate-800">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-600" />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Generating live — {posts.length} / {maxPosts} posts ready
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSavePack}
                disabled={saving || saved}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : saved ? "Saved to library ✓" : "Save pack to library"}
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  setPosts([]);
                  setPlanInfo(null);
                  setSaved(false);
                  setError(null);
                  setLoadingProgress(0);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Clear preview
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
                    {post.uniqueness && (
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          post.uniqueness.score >= 75
                            ? "bg-emerald-50 text-emerald-700"
                            : post.uniqueness.score >= 50
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {post.uniqueness.score}/100 unique
                      </span>
                    )}
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