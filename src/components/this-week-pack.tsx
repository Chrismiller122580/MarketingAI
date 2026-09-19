"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSite } from "@/context/site-context";
import { useSettings } from "@/context/settings-context";
import { usePosts } from "@/context/posts-context";
import { WEEK_PACK_SIZE } from "@/lib/week-pack";
import type { SavedPost } from "@/lib/types";
import { LoadingOverlay } from "./loading-indicator";

type Usage = {
  paid: boolean;
  generationsUsed: number;
  generationsLimit: number | null;
};

export function ThisWeekPack() {
  const { site } = useSite();
  const { settings } = useSettings();
  const { refresh } = usePosts();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    posts: SavedPost[];
    theme?: string;
    learnedFromWins?: boolean;
    remaining?: number | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/account/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.usage) setUsage(data.usage);
      })
      .catch(() => {});
  }, []);

  const remaining = useMemo(() => {
    if (!usage || usage.paid || usage.generationsLimit == null) return null;
    return Math.max(0, usage.generationsLimit - usage.generationsUsed);
  }, [usage]);

  const packSize =
    remaining == null ? WEEK_PACK_SIZE : Math.min(WEEK_PACK_SIZE, remaining);
  const quotaBlocked = remaining === 0;

  async function handleGenerate() {
    if (!site || loading || quotaBlocked) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate/week-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ?? "Could not generate this week's pack. Try again.",
        );
      }
      const posts = (data.posts ?? []) as SavedPost[];
      if (posts.length === 0) {
        throw new Error("No posts were generated. Recrawl the site and try again.");
      }
      setResult({
        posts,
        theme: data.plan?.theme,
        learnedFromWins: data.learnedFromWins,
        remaining: data.remaining,
      });
      if (typeof data.remaining === "number" && usage && !usage.paid) {
        setUsage({
          ...usage,
          generationsUsed:
            (usage.generationsLimit ?? 0) - Math.max(0, data.remaining),
        });
      }
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate this week's pack.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!site) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-gradient-to-br from-amber-50/70 to-white p-6 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          This week
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Generate this week's pack
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Crawl your website first. Then one tap builds about {WEEK_PACK_SIZE}{" "}
          on-brand posts and drops them on your calendar.
        </p>
      </div>
    );
  }

  return (
    <>
      <LoadingOverlay
        show={loading}
        label={`Building ${packSize} posts for this week…`}
        sublabel="Planning unused pages, writing dual-AI captions, and saving them to your calendar"
        progress={{ current: loading ? 1 : 0, total: packSize }}
      />
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-spark-50 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              One tap
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Generate this week's pack
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              {packSize} publish-ready posts from unused pages on {site.brand.name},
              scheduled across the next {packSize} days. Free includes 15 posts a
              month — this uses {packSize}.
            </p>
            {remaining != null && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {remaining} generation{remaining === 1 ? "" : "s"} left this month
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || quotaBlocked}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {quotaBlocked
              ? "Out of free posts"
              : loading
                ? "Generating…"
                : `Generate ${packSize} posts`}
          </button>
        </div>

        {quotaBlocked && (
          <div className="border-t border-amber-100 px-6 py-3 text-sm text-slate-600 dark:border-amber-900/40 dark:text-slate-300">
            You've used this month's free posts.{" "}
            <Link href="/billing" className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
              Upgrade to Pro
            </Link>{" "}
            for unlimited packs.
          </div>
        )}

        {error && (
          <div className="border-t border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            {error}{" "}
            {/upgrade|billing|free includes/i.test(error) && (
              <Link href="/billing" className="font-medium underline underline-offset-2">
                Open billing
              </Link>
            )}
          </div>
        )}

        {result && (
          <div className="border-t border-amber-100 px-6 py-4 dark:border-amber-900/40">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {result.posts.length} post{result.posts.length === 1 ? "" : "s"} saved
              {result.theme ? ` · ${result.theme}` : ""}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              On your calendar below. Review, drag to a new day, then publish.
              {result.learnedFromWins
                ? " Copy learned from your top-performing posts."
                : ""}
            </p>
            <ul className="mt-3 space-y-2">
              {result.posts.map((post) => (
                <li
                  key={post.id}
                  className="flex gap-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <span className="w-20 shrink-0 capitalize text-slate-500">
                    {post.platform}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-200">
                    {post.text.split("\n")[0]}
                  </span>
                  {post.scheduledFor && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {post.scheduledFor}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link
                href="/posts"
                className="font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                Open library
              </Link>
              <Link
                href="/content"
                className="text-slate-500 hover:underline dark:text-slate-400"
              >
                Tweak in Content Studio
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
