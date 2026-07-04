"use client";

import Link from "next/link";
import { useSite } from "@/context/site-context";
import { usePosts } from "@/context/posts-context";

export function QuickActions() {
  const { site } = useSite();
  const { posts } = usePosts();

  if (!site) {
    return (
      <div className="rounded-xl border border-crawl-100 bg-gradient-to-br from-crawl-50 to-spark-50 p-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Get started in 3 steps
        </h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
              1
            </span>
            Enter your website domain above
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
              2
            </span>
            AI crawls pages, images, and brand voice
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
              3
            </span>
            Generate posts with images or a full campaign pack
          </li>
        </ol>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Link
        href="/content"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md"
      >
        <p className="text-2xl">✦</p>
        <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Content Studio</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Social posts with matched images
        </p>
      </Link>
      <Link
        href="/content?type=reels-stories"
        className="rounded-xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-amber-50 p-5 shadow-sm transition hover:border-fuchsia-300 hover:shadow-md dark:border-fuchsia-900/50 dark:from-fuchsia-950/30 dark:to-amber-950/20"
      >
        <p className="text-2xl">📱</p>
        <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Reels & Stories</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          9:16 vertical video and Story visuals
        </p>
      </Link>
      <Link
        href="/content?type=video"
        className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-spark-50 p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-amber-900/50 dark:from-amber-950/30 dark:to-spark-950/20"
      >
        <p className="text-2xl">🎬</p>
        <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Video Ad</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          AI video ads (5–10s) from your brand
        </p>
      </Link>
      <Link
        href="/campaigns"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md"
      >
        <p className="text-2xl">◎</p>
        <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Campaign pack</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Generate up to 15 posts at once
        </p>
      </Link>
      <Link
        href="/posts"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md"
      >
        <p className="text-2xl">▤</p>
        <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Post library</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {posts.length} saved post{posts.length !== 1 ? "s" : ""}
        </p>
      </Link>
    </div>
  );
}