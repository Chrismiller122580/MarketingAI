"use client";

import Image from "next/image";
import { useSite } from "@/context/site-context";

export function SitePagesPanel() {
  const { site } = useSite();

  if (!site) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No site loaded yet</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter a domain above to pull content from every page on the site.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Site pages ({site.pages.length})
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Content + images from {site.domain}
        </p>
      </div>

      <div className="max-h-[520px] divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
        {site.pages.map((page) => (
          <div key={page.url} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/80">
            <div className="flex gap-4">
              {page.ogImage && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={`/api/image?url=${encodeURIComponent(page.ogImage)}`}
                    alt={page.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{page.title}</p>
                    <p className="mt-0.5 text-xs text-amber-600">{page.path}</p>
                  </div>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium text-amber-600 hover:text-amber-700"
                  >
                    View →
                  </a>
                </div>
                {page.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{page.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{page.images.length} images</span>
                  {page.headings.length > 0 && (
                    <span>· {page.headings.slice(0, 2).join(" · ")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}