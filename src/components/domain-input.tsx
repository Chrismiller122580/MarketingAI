"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useSite } from "@/context/site-context";
import { InlineLoading } from "./loading-indicator";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function displayDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "");
}

type DomainInputProps = {
  compact?: boolean;
  variant?: "default" | "dashboard";
};

export function DomainInput({ compact = false, variant = "default" }: DomainInputProps) {
  const {
    domainInput,
    setDomainInput,
    site,
    status,
    error,
    crawlSite,
    clearSite,
    loadSavedSite,
    deleteSavedSite,
    savedSites,
  } = useSite();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = status === "loading";

  function selectSavedSite(domain: string) {
    void loadSavedSite(domain);
    if (pathname !== "/content" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("domain") && !params.has("influencer") && !params.has("page")) {
      return;
    }
    params.set("domain", domain);
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (compact) {
    return (
      <form
        className="flex w-full items-center gap-2 lg:w-auto"
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
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 sm:max-w-48 sm:flex-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="h-9 rounded-lg bg-amber-600 px-3 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
        >
          {isLoading ? <InlineLoading label="Crawling…" /> : "Crawl"}
        </button>
      </form>
    );
  }

  const isDashboard = variant === "dashboard";

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Site domain
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Crawl your site to extract pages, images, brand voice, and keywords
            for AI-powered posts.
          </p>
        </div>
        {site && (
          <button
            type="button"
            onClick={clearSite}
            className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {isDashboard ? "Deselect" : "Clear"}
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
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500">
            https://
          </span>
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="yourcompany.com"
            className="h-11 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-[4.5rem] pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !domainInput.trim()}
          className="h-11 shrink-0 rounded-lg bg-amber-600 px-6 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <InlineLoading label="Analyzing site & business model…" />
          ) : site ? (
            "Re-crawl site"
          ) : (
            "Crawl site"
          )}
        </button>
      </form>

      {isLoading && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          <span>
            Crawling pages, extracting brand voice, and detecting business model…
          </span>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {isDashboard && site && status === "success" && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Active client
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
            <strong>{site.brand.name}</strong>
            <span className="text-emerald-600/80 dark:text-emerald-400/80">
              {displayDomain(site.domain)}
            </span>
            <span className="text-emerald-700/70 dark:text-emerald-300/70">
              · {site.pages.length} pages · {site.images.length} images
            </span>
            <span className="text-emerald-700/70 dark:text-emerald-300/70">
              · crawled {formatRelativeDate(site.crawledAt)}
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
            <Link
              href={`/creator-studio?domain=${encodeURIComponent(site.domain)}`}
              className="ml-auto rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
            >
              Create site-smart avatar →
            </Link>
          </div>
        </div>
      )}

      {!isDashboard && site && status === "success" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>✓</span>
          <span>
            <strong>{site.brand.name}</strong> — {site.pages.length} pages,{" "}
            {site.images.length} images
            {site.brand.businessModel && (
              <>
                , <span className="capitalize">{site.brand.businessModel.type}</span>{" "}
                ({site.brand.businessModel.market})
              </>
            )}
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
          <span className="ml-auto text-xs font-medium">Saved to clients</span>
        </div>
      )}

      {isDashboard && savedSites.length > 0 && (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            Your clients ({savedSites.length})
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {savedSites.map((s) => {
              const isActive = !!site && s.domain === site.domain;
              return (
                <div
                  key={s.domain}
                  className={`relative rounded-lg border p-4 transition ${
                    isActive
                      ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => !isActive && selectSavedSite(s.domain)}
                      disabled={isActive || isLoading}
                      className={`min-w-0 flex-1 text-left ${isActive ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {s.brandName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-amber-600 dark:text-amber-500">
                        {displayDomain(s.domain)}
                      </p>
                    </button>
                    {isActive ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Delete ${displayDomain(s.domain)}? Crawled data will be removed. Posts are kept.`,
                            )
                          ) {
                            void deleteSavedSite(s.domain);
                          }
                        }}
                        className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        title="Delete client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{s.pages} pages</span>
                    <span>{s.images} images</span>
                    <span>Crawled {formatRelativeDate(s.crawledAt)}</span>
                  </div>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => selectSavedSite(s.domain)}
                      disabled={isLoading}
                      className="mt-3 text-xs font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 dark:text-amber-500"
                    >
                      Load client →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isDashboard && savedSites.length > 0 && (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Your saved sites — click to load (no re-crawl needed):
          </p>
          <div className="flex flex-wrap gap-2">
            {savedSites.map((s) => {
              const isCurrent = !!site && s.domain === site.domain;
              return (
                <button
                  key={s.domain}
                  onClick={() => selectSavedSite(s.domain)}
                  disabled={isCurrent}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    isCurrent
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default dark:bg-emerald-950/30 dark:border-emerald-800"
                      : "hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                  title={`Last crawled ${new Date(s.crawledAt).toLocaleDateString()} • ${s.pages} pages, ${s.images} images`}
                >
                  {displayDomain(s.domain)}
                  {isCurrent && " (current)"}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
