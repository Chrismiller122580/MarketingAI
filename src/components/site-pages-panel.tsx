"use client";

import Image from "next/image";
import { useSite } from "@/context/site-context";

export function SitePagesPanel() {
  const { site } = useSite();

  if (!site) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">No site loaded yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Enter a domain above to pull content from every page on the site.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          Site pages ({site.pages.length})
        </h2>
        <p className="text-sm text-slate-500">
          Content + images from {site.domain}
        </p>
      </div>

      <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
        {site.pages.map((page) => (
          <div key={page.url} className="px-6 py-4 hover:bg-slate-50/80">
            <div className="flex gap-4">
              {page.ogImage && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
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
                    <p className="font-medium text-slate-900">{page.title}</p>
                    <p className="mt-0.5 text-xs text-indigo-600">{page.path}</p>
                  </div>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View →
                  </a>
                </div>
                {page.description && (
                  <p className="mt-2 text-sm text-slate-600">{page.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
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