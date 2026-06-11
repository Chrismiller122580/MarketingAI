"use client";

import Image from "next/image";
import type { GeneratedPost, Platform } from "@/lib/types";

const platformLabels: Record<Platform, string> = {
  instagram: "Instagram",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  pinterest: "Pinterest",
};

const aspectClasses: Record<Platform, string> = {
  instagram: "aspect-square",
  twitter: "aspect-video",
  linkedin: "aspect-[1.91/1]",
  facebook: "aspect-[1.91/1]",
  pinterest: "aspect-[2/3] max-h-[420px]",
};

export function PostPreview({ post }: { post: GeneratedPost }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-crawl-700 to-spark-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {platformLabels[post.platform]}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{post.contentType}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            post.image.source === "site"
              ? "bg-emerald-50 text-emerald-700"
              : post.image.source === "ai"
                ? "bg-teal-50 text-teal-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          {post.image.source === "site"
            ? "Site image"
            : post.image.source === "ai"
              ? "AI generated"
              : "Branded visual"}
        </span>
      </div>

      <div className={`relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${aspectClasses[post.platform]}`}>
        <Image
          src={post.image.url}
          alt={post.image.alt}
          fill
          unoptimized
          className="object-cover"
        />
      </div>

      <div className="space-y-3 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {post.text}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium text-amber-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{post.characterCount} characters</span>
          {post.sourcePage && <span>Source: {post.sourcePage}</span>}
        </div>
      </div>
    </div>
  );
}