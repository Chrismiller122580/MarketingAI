"use client";

import { usePosts } from "@/context/posts-context";
import { useSite } from "@/context/site-context";

export function AnalyticsOverview() {
  const { site } = useSite();
  const { posts } = usePosts();

  const published = posts.filter((p) => p.publishStatus === "published").length;
  const scheduled = posts.filter((p) => p.scheduledFor).length;
  const byPlatform = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.platform] = (acc[p.platform] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Content pipeline
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-900">{posts.length}</p>
            <p className="text-xs text-slate-500">Total posts</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-2xl font-bold text-amber-700">{scheduled}</p>
            <p className="text-xs text-slate-500">Scheduled</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-2xl font-bold text-emerald-700">{published}</p>
            <p className="text-xs text-slate-500">Published</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Posts by platform
        </h2>
        {Object.keys(byPlatform).length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No posts yet</p>
        ) : (
          <div className="mt-4 space-y-3">
            {Object.entries(byPlatform).map(([platform, count]) => (
              <div key={platform}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize text-slate-700">{platform}</span>
                  <span className="font-medium text-slate-900">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-crawl-600 to-spark-500"
                    style={{
                      width: `${Math.round((count / posts.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {site && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">
            Site content index
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-crawl-700">
                {site.pages.length}
              </p>
              <p className="text-xs text-slate-500">Pages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-crawl-700">
                {site.images.length}
              </p>
              <p className="text-xs text-slate-500">Images</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-spark-600">
                {site.brand.keywords.length}
              </p>
              <p className="text-xs text-slate-500">Keywords</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-spark-600">
                {site.brand.topics.length}
              </p>
              <p className="text-xs text-slate-500">Topics</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}