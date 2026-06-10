"use client";

import Image from "next/image";
import { useSite } from "@/context/site-context";

export function SiteImagesPanel() {
  const { site } = useSite();

  if (!site) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">No images indexed</p>
        <p className="mt-1 text-sm text-slate-500">
          Crawl a domain to extract images for your posts.
        </p>
      </div>
    );
  }

  if (site.images.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-medium text-amber-800">
          No images found on this site
        </p>
        <p className="mt-1 text-sm text-amber-700">
          MarketingAI will generate branded visuals automatically for your posts.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          Site images ({site.images.length})
        </h2>
        <p className="text-sm text-slate-500">
          Extracted from crawled pages — auto-matched to posts
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {site.images.slice(0, 12).map((img) => (
          <div
            key={img.url}
            className="group overflow-hidden rounded-lg border border-slate-200"
          >
            <div className="relative aspect-square bg-slate-100">
              <Image
                src={`/api/image?url=${encodeURIComponent(img.url)}`}
                alt={img.alt || "Site image"}
                fill
                unoptimized
                className="object-cover transition group-hover:scale-105"
              />
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium text-slate-700">
                {img.alt || "Untitled"}
              </p>
              <p className="truncate text-xs text-slate-400">{img.pagePath}</p>
              <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {img.source} · score {img.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}