"use client";

import Image from "next/image";
import { usePosts } from "@/context/posts-context";
import type { SavedPost } from "@/lib/types";

function PostCard({
  post,
  onDelete,
}: {
  post: SavedPost;
  onDelete: () => void;
}) {
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
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium capitalize text-indigo-700">
            {post.platform}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="mt-2 line-clamp-4 text-sm text-slate-700">{post.text}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(post.text)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Copy
          </button>
          <a
            href={post.image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
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
      </div>
    </div>
  );
}

export function PostsLibrary() {
  const { posts, packs, deletePost, deletePack, clearAll } = usePosts();

  if (posts.length === 0 && packs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-lg font-medium text-slate-700">No saved posts yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Generate content in the studio or create a campaign pack — then save
          posts here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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