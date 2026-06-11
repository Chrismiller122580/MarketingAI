"use client";

import Image from "next/image";
import { usePosts } from "@/context/posts-context";
import { PublishPanel } from "./publish-panel";
import type { SavedPost } from "@/lib/types";

function PostCard({
  post,
  onDelete,
}: {
  post: SavedPost;
  onDelete: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    scheduled: "bg-amber-50 text-amber-700",
    published: "bg-emerald-50 text-emerald-700",
    failed: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-video bg-slate-100">
        <Image
          src={post.image.url}
          alt={post.image.alt}
          fill
          unoptimized
          className="object-cover"
        />
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[post.publishStatus ?? "draft"]}`}
        >
          {post.publishStatus ?? "draft"}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium capitalize text-amber-700">
            {post.platform}
          </span>
          <span className="text-xs text-slate-400">
            {post.scheduledFor ?? new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-slate-700">{post.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(post.text)}
            className="text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            Copy
          </button>
          <a
            href={post.image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            Image
          </a>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs font-medium text-rose-500 hover:text-rose-600"
          >
            Delete
          </button>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <PublishPanel post={post} />
        </div>
      </div>
    </div>
  );
}

export function PostsLibrary() {
  const { posts, packs, deletePost, deletePack, clearAll, publishPost } =
    usePosts();

  async function publishAllScheduled() {
    const scheduled = posts.filter(
      (p) => p.scheduledFor && p.publishStatus !== "published",
    );
    for (const post of scheduled) {
      await publishPost(post.id);
    }
  }

  if (posts.length === 0 && packs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-lg font-medium text-slate-700">No saved posts yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Generate content in the studio or create a campaign pack.
        </p>
      </div>
    );
  }

  const scheduledCount = posts.filter(
    (p) => p.scheduledFor && p.publishStatus !== "published",
  ).length;

  return (
    <div className="space-y-8">
      {scheduledCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
          <p className="text-sm text-amber-800">
            <strong>{scheduledCount}</strong> posts ready to publish
          </p>
          <button
            type="button"
            onClick={publishAllScheduled}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Publish all scheduled
          </button>
        </div>
      )}

      {packs.length > 0 && (
        <div>
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Campaign packs ({packs.length})
          </h2>
          <div className="space-y-3">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{pack.name}</p>
                  <p className="text-sm text-slate-500">
                    {pack.posts.length} posts ·{" "}
                    {new Date(pack.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deletePack(pack.id)}
                  className="text-sm text-rose-500 hover:text-rose-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {posts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              All posts ({posts.length})
            </h2>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={() => deletePost(post.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}