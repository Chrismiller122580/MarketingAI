"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePosts } from "@/context/posts-context";
import type { PerformanceSummary, SavedPost } from "@/lib/types";

export function PerformancePanel() {
  const { refresh } = usePosts();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [topPosts, setTopPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics/performance");
      const data = await response.json();
      if (data.summary) setSummary(data.summary);
      if (data.topPosts) setTopPosts(data.topPosts);
    } catch {
      /* keep prior */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/analytics/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Sync failed");
      setSummary(data.summary);
      setSyncResult(
        `Synced ${data.synced} post${data.synced === 1 ? "" : "s"}${data.failed ? ` (${data.failed} unavailable)` : ""}.`,
      );
      await refresh();
      await load();
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (loading && !summary) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">Loading performance data…</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Post performance
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {summary.withMetrics} of {summary.totalPublished} published posts with live metrics
            {summary.lastSyncedAt &&
              ` · Last sync ${new Date(summary.lastSyncedAt).toLocaleString()}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-crawl-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-crawl-800 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Refresh metrics"}
        </button>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.totalImpressions.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Impressions</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-950/30">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {summary.totalEngagements.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Engagements</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 text-center dark:bg-amber-950/30">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {summary.avgEngagementRate}%
            </p>
            <p className="text-xs text-slate-500">Avg engagement rate</p>
          </div>
          <div className="rounded-lg bg-violet-50 p-4 text-center dark:bg-violet-950/30">
            <p className="text-2xl font-bold capitalize text-violet-700 dark:text-violet-400">
              {summary.topPlatform ?? "—"}
            </p>
            <p className="text-xs text-slate-500">Top platform</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Double down on
            </p>
            <ul className="mt-2 space-y-2">
              {summary.recommendations.map((rec) => (
                <li
                  key={rec}
                  className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="text-emerald-500">↑</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {summary.influencerStats && summary.influencerStats.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Avatar performance
              </p>
              <div className="mt-2 space-y-2">
                {summary.influencerStats.map((stat) => (
                  <div
                    key={stat.influencerId}
                    className="rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 dark:border-violet-900/50 dark:bg-violet-950/20"
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {stat.displayName ?? "Influencer"}
                      {stat.handle ? ` · @${stat.handle}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {stat.posts} post{stat.posts === 1 ? "" : "s"}
                      {stat.withMetrics > 0 &&
                        ` · ${stat.engagements} engagements · ${Math.round(stat.avgEngagementRate * 10) / 10}% avg`}
                      {stat.motionPosts > 0 &&
                        ` · ${stat.motionPosts} motion clip${stat.motionPosts === 1 ? "" : "s"}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(summary.platformStats).length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                By platform
              </p>
              <div className="mt-2 space-y-2">
                {Object.entries(summary.platformStats).map(([platform, stats]) => (
                  <div key={platform} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-600 dark:text-slate-300">
                      {platform}
                    </span>
                    <span className="text-slate-500">
                      {stats.engagements} eng · {stats.avgEngagementRate}% rate
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {topPosts.length > 0 && (
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Top performing posts
          </p>
          <div className="mt-3 space-y-2">
            {topPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                    {post.text.slice(0, 80)}…
                  </p>
                  <p className="text-xs capitalize text-slate-400">
                    {post.platform}
                    {post.influencerId && " · avatar linked"}
                    {post.sourcePage && ` · ${post.sourcePage}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-emerald-600">
                  {post.performance?.engagementRate ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {syncResult && (
        <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500 dark:border-slate-800">
          {syncResult}
        </p>
      )}

      {summary.totalPublished === 0 && (
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <p className="text-sm text-slate-500">
            Publish posts via connected social accounts to track impressions and engagement.{" "}
            <Link href="/posts" className="font-medium text-amber-600 hover:underline">
              Go to Post Library
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}