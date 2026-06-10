"use client";

import { useSite } from "@/context/site-context";
import type { GeneratedPost } from "@/lib/types";

export function BrandInsights({ post }: { post?: GeneratedPost | null }) {
  const { site } = useSite();

  if (!site) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">AI insights</h2>
        <p className="text-sm text-slate-500">
          How MarketingAI analyzed your site
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg"
            style={{ backgroundColor: site.brand.themeColor }}
          />
          <div>
            <p className="font-medium text-slate-900">{site.brand.name}</p>
            <p className="text-sm text-slate-500">{site.brand.tagline}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Detected tone
          </p>
          <p className="mt-1 text-sm text-slate-700">{site.brand.tone}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Brand keywords
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {site.brand.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-lg font-bold text-slate-900">
              {site.pages.length}
            </p>
            <p className="text-xs text-slate-500">Pages</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-lg font-bold text-slate-900">
              {site.images.length}
            </p>
            <p className="text-xs text-slate-500">Images</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-lg font-bold text-slate-900">
              {site.brand.topics.length}
            </p>
            <p className="text-xs text-slate-500">Topics</p>
          </div>
        </div>

        {post && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">
              Generation reasoning
            </p>
            <ul className="mt-2 space-y-1.5">
              {post.insights.map((insight) => (
                <li
                  key={insight}
                  className="flex gap-2 text-sm text-slate-700"
                >
                  <span className="text-indigo-400">→</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}