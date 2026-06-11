"use client";

import { useState } from "react";
import { usePosts } from "@/context/posts-context";
import type { PublishResult, SavedPost } from "@/lib/types";

export function PublishPanel({ post }: { post: SavedPost }) {
  const { publishPost } = usePosts();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);

  async function handlePublish() {
    setLoading(true);
    setResult(null);
    try {
      const res = await publishPost(post.id);
      setResult(res);
    } catch {
      setResult({
        success: false,
        platform: post.platform,
        method: "api",
        message: "Publish request failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handlePublish}
        disabled={loading || post.publishStatus === "published"}
        className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {loading
          ? "Publishing…"
          : post.publishStatus === "published"
            ? "Published ✓"
            : `Publish to ${post.platform}`}
      </button>

      {result && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            result.success
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          <p>{result.message}</p>
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-medium underline"
            >
              {result.method === "share_link" ? "Open share link →" : "View post →"}
            </a>
          )}
        </div>
      )}

      {post.scheduledFor && post.publishStatus !== "published" && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Scheduled for {post.scheduledFor}
        </p>
      )}
    </div>
  );
}