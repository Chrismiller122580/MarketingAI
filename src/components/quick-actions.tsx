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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Link
        href="/content"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md"
      >
        <p className="text-2xl">✦</p>
        <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">Create a post</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Single post with matched image
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