"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { usePosts } from "@/context/posts-context";
import { useSite } from "@/context/site-context";
import { PublishPanel } from "./publish-panel";
import type { PostMedia, SavedPost } from "@/lib/types";

const VisualPostEditor = dynamic(
  () =>
    import("./visual-post-editor").then((m) => m.VisualPostEditor),
  { ssr: false },
);

function PostCard({
  post,
  onDelete,
  onEditVisual,
}: {
  post: SavedPost;
  onDelete: () => void;
  onEditVisual: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    scheduled: "bg-amber-50 text-amber-700",
    published: "bg-emerald-50 text-emerald-700",
    failed: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
        {post.image.videoUrl ? (
          <video
            src={post.image.videoUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            poster={post.image.url}
          />
        ) : (
          <Image
            src={post.image.url}
            alt={post.image.alt}
            fill
            unoptimized
            className="object-cover"
          />
        )}
        {post.contentType === "Video Ad" && (
          <span className="absolute left-2 top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white">
            Video
          </span>
        )}
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
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {post.scheduledFor ?? new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-slate-700 dark:text-slate-300">{post.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!post.image.videoUrl && post.contentType !== "Video Ad" && (
            <button
              type="button"
              onClick={onEditVisual}
              className="text-xs font-medium text-violet-600 hover:text-violet-700"
            >
              Edit visual
            </button>
          )}
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(post.text)}
            className="text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            Copy
          </button>
          {post.image.videoUrl ? (
            <a
              href={post.image.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-amber-600 hover:text-amber-700"
            >
              Video
            </a>
          ) : (
            <a
              href={post.image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-amber-600 hover:text-amber-700"
            >
              Image
            </a>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="text-xs font-medium text-rose-500 hover:text-rose-600"
          >
            Delete
          </button>
        </div>
        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <PublishPanel post={post} />
        </div>
      </div>
    </div>
  );
}

export function PostsLibrary() {
  const { site } = useSite();
  const { posts, packs, deletePost, deletePack, clearAll, publishPost, updatePostMedia } =
    usePosts();
  const [editingPost, setEditingPost] = useState<SavedPost | null>(null);

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
      <div className="rounded-xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-12 text-center">
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No saved posts yet</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
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
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
            Campaign packs ({packs.length})
          </h2>
          <div className="space-y-3">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{pack.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
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
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              All posts ({posts.length})
            </h2>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
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
                onEditVisual={() => setEditingPost(post)}
              />
            ))}
          </div>
        </div>
      )}

      {editingPost && site && (
        <VisualPostEditor
          post={editingPost}
          postId={editingPost.id}
          brandName={site.brand.name}
          themeColor={site.brand.themeColor}
          onSave={(image: PostMedia) => {
            updatePostMedia(editingPost.id, image).catch(() => {});
          }}
          onClose={() => setEditingPost(null)}
        />
      )}
    </div>
  );
}