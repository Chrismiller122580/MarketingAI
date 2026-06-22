"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSite } from "@/context/site-context";
import { useSettings } from "@/context/settings-context";
import { usePosts } from "@/context/posts-context";
import { analyzeContentGaps } from "@/lib/content-strategy";
import { suggestFreshAngles } from "@/lib/content-uniqueness";
import { getAngleLabel } from "@/lib/content-angles";
import type { ContentGapAnalysis } from "@/lib/types";

export function ContentStrategyPanel() {
  const { site } = useSite();
  const { settings } = useSettings();
  const { posts } = usePosts();
  const [analysis, setAnalysis] = useState<ContentGapAnalysis | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [aiTips, setAiTips] = useState(false);

  const refresh = useCallback(() => {
    if (!site) {
      setAnalysis(null);
      return;
    }
    setAnalysis(analyzeContentGaps(site, posts, settings));
  }, [site, posts, settings]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function fetchAiRecommendations() {
    if (!site) return;
    setEnriching(true);
    try {
      const response = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, enrich: true }),
      });
      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setAiTips(true);
      }
    } catch {
      /* keep local analysis */
    } finally {
      setEnriching(false);
    }
  }

  if (!site) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Content strategy
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Crawl your site to see gap analysis and posting recommendations.
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  const freshAngles = suggestFreshAngles(site, posts.map((p) => ({
    text: p.text,
    sourcePage: p.sourcePage,
    platform: p.platform,
  })));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Content strategy
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {analysis.pageCount} pages indexed · {analysis.totalPosts} posts in library
            {analysis.publishedPosts > 0 && ` · ${analysis.publishedPosts} published`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchAiRecommendations}
            disabled={enriching}
            className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:bg-violet-950/40 dark:text-violet-300"
          >
            {enriching ? "Thinking…" : aiTips ? "Refresh AI tips" : "Get AI recommendations"}
          </button>
          <Link
            href="/campaigns"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            Plan campaign
          </Link>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              What to post next
            </p>
            <ul className="mt-2 space-y-2">
              {analysis.recommendations.map((rec) => (
                <li
                  key={rec}
                  className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="text-amber-500">→</span>
                  {rec}
                </li>
              ))}
              {analysis.recommendations.length === 0 && (
                <li className="text-sm text-slate-500">
                  Great coverage — keep your calendar full with fresh angles.
                </li>
              )}
            </ul>
          </div>

          {freshAngles.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Fresh angles to try
              </p>
              <ul className="mt-2 space-y-2">
                {freshAngles.map((suggestion) => (
                  <li key={`${suggestion.angle}-${suggestion.reason}`}>
                    <Link
                      href={`/content?angle=${suggestion.angle}`}
                      className="group flex gap-2 rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm transition hover:border-violet-200 hover:bg-violet-50 dark:border-violet-900 dark:bg-violet-950/20 dark:hover:bg-violet-950/40"
                    >
                      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                        {getAngleLabel(suggestion.angle)}
                      </span>
                      <span className="text-slate-600 group-hover:text-slate-800 dark:text-slate-300 dark:group-hover:text-slate-100">
                        {suggestion.reason}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.uncoveredThemes.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Uncovered themes
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {analysis.uncoveredThemes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {analysis.underusedPages.length > 0 && (
            <div className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Underused pages ({analysis.underusedPages.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {analysis.underusedPages.slice(0, 5).map((page) => (
                  <li
                    key={page.path}
                    className="text-sm text-slate-600 dark:text-slate-300"
                  >
                    <span className="font-mono text-xs text-slate-400">{page.path}</span>
                    {" — "}
                    {page.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.missingPlatforms.length > 0 && (
            <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900 dark:bg-rose-950/20">
              <p className="text-xs font-medium uppercase tracking-wider text-rose-600">
                Missing platforms
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                No posts yet for:{" "}
                {analysis.missingPlatforms.map((p) => (
                  <span
                    key={p}
                    className="mr-1.5 inline-flex rounded-full bg-white px-2 py-0.5 text-xs capitalize dark:bg-slate-900"
                  >
                    {p}
                  </span>
                ))}
              </p>
            </div>
          )}

          {analysis.performance && analysis.performance.withMetrics > 0 && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
                Performance insight
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {analysis.performance.totalEngagements.toLocaleString()} engagements across{" "}
                {analysis.performance.withMetrics} tracked posts
                {analysis.performance.topPlatform &&
                  ` · ${analysis.performance.topPlatform} is your top channel`}
              </p>
              <Link
                href="/analytics"
                className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                View full analytics →
              </Link>
            </div>
          )}

          {Object.keys(analysis.platformBreakdown).length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Platform mix
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(analysis.platformBreakdown).map(([platform, count]) => (
                  <span
                    key={platform}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {platform}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}