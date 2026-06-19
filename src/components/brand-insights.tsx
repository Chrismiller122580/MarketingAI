"use client";

import { useSite } from "@/context/site-context";
import type { GeneratedPost } from "@/lib/types";

export function BrandInsights({ post }: { post?: GeneratedPost | null }) {
  const { site } = useSite();

  if (!site) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">AI insights</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          How crawlspark.ai analyzed your site
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg"
            style={{ backgroundColor: site.brand.themeColor }}
          />
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">{site.brand.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{site.brand.tagline}</p>
          </div>
        </div>

        {site.brand.businessModel && (
          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Business model
            </p>
            <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p>
                <span className="font-medium capitalize">{site.brand.businessModel.type}</span>
                {" · "}
                <span className="uppercase">{site.brand.businessModel.market}</span>
              </p>
              <p className="text-xs leading-relaxed">{site.brand.businessModel.valueProposition}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white px-2 py-0.5 text-xs dark:bg-slate-900">
                  {site.brand.businessModel.revenueModel}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  Goal: {site.brand.businessModel.conversionGoal}
                </span>
              </div>
              {site.brand.businessModel.differentiators.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {site.brand.businessModel.differentiators.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Detected tone
          </p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{site.brand.tone}</p>
        </div>

        {site.brand.synthesis && (
          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              AI brand voice
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {site.brand.synthesis.voiceGuide}
            </p>
            {site.brand.synthesis.audiencePersona && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Audience: {site.brand.synthesis.audiencePersona}
              </p>
            )}
            {site.brand.synthesis.messagingPillars.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {site.brand.synthesis.messagingPillars.map((pillar) => (
                  <span
                    key={pillar}
                    className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-slate-900 dark:text-amber-300"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            )}
            {site.brand.synthesis.contentThemes.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500">Content themes</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {site.brand.synthesis.contentThemes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Brand keywords
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {site.brand.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {site.pages.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pages</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {site.images.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Images</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {site.brand.topics.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Topics</p>
          </div>
        </div>

        {post && (
          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
              Generation reasoning
            </p>
            <ul className="mt-2 space-y-1.5">
              {post.insights.map((insight) => (
                <li
                  key={insight}
                  className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="text-amber-400">→</span>
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