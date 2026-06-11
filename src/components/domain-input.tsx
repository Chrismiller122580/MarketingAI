"use client";

import { useSite } from "@/context/site-context";

export function DomainInput({ compact = false }: { compact?: boolean }) {
  const { domainInput, setDomainInput, site, status, error, crawlSite, clearSite } =
    useSite();

  const isLoading = status === "loading";

  if (compact) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          crawlSite();
        }}
      >
        <input
          type="text"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          placeholder="example.com"
          className="h-9 w-48 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="h-9 rounded-lg bg-amber-600 px-3 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
        >
          {isLoading ? "…" : "Crawl"}
        </button>
      </form>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Site domain</h2>
          <p className="mt-1 text-sm text-slate-500">
            Crawl your site to extract pages, images, brand voice, and keywords
            for AI-powered posts.
          </p>
        </div>
        {site && (
          <button
            type="button"
            onClick={clearSite}
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          crawlSite();
        }}
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            https://
          </span>
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="yourcompany.com"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-[4.5rem] pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !domainInput.trim()}
          className="h-11 shrink-0 rounded-lg bg-amber-600 px-6 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Analyzing site…" : site ? "Re-crawl site" : "Crawl site"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {site && status === "success" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>✓</span>
          <span>
            <strong>{site.brand.name}</strong> — {site.pages.length} pages,{" "}
            {site.images.length} images, {site.brand.keywords.length} keywords
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${site.brand.themeColor}20`,
              color: site.brand.themeColor,
            }}
          >
            {site.brand.tone}
          </span>
        </div>
      )}
    </div>
  );
}