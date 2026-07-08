"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import {
  filterCrawledPages,
  findPageByValue,
  getPageValue,
  PAGE_ROLE_FILTERS,
  PAGE_ROLE_LABELS,
  sortCrawledPages,
  type PageRoleFilter,
} from "@/lib/crawled-page-utils";
import { classifySitePage } from "@/lib/viraforge/site-facts-extractor";
import type { SitePage } from "@/lib/types";

export type CrawledPagePickerProps = {
  pages: SitePage[];
  value: string;
  onChange: (value: string) => void;
  valueMode?: "path" | "url";
  allowAuto?: boolean;
  autoValue?: string;
  autoLabel?: string;
  recommendedPath?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  hint?: string;
  className?: string;
};

export function CrawledPagePicker({
  pages,
  value,
  onChange,
  valueMode = "path",
  allowAuto = false,
  autoValue = "all",
  autoLabel = "Best matching page (AI picks)",
  recommendedPath,
  disabled = false,
  id,
  label,
  hint,
  className = "",
}: CrawledPagePickerProps) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<PageRoleFilter>("all");

  const sortedPages = useMemo(
    () => sortCrawledPages(pages, recommendedPath),
    [pages, recommendedPath],
  );

  const filteredPages = useMemo(
    () => filterCrawledPages(sortedPages, query, roleFilter),
    [sortedPages, query, roleFilter],
  );

  const selectedPage = findPageByValue(pages, value, valueMode);
  const isAuto = allowAuto && value === autoValue;

  const roleFilters = useMemo(() => {
    const roles = new Set(pages.map((p) => classifySitePage(p)));
    return PAGE_ROLE_FILTERS.filter(
      (f) => f.value === "all" || roles.has(f.value as Exclude<PageRoleFilter, "all">),
    );
  }, [pages]);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      {hint && (
        <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages by title, path, or content…"
          disabled={disabled || pages.length === 0}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {roleFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            disabled={disabled}
            onClick={() => setRoleFilter(filter.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === filter.value
                ? "bg-violet-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {selectedPage && !isAuto && (
        <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs">
          <p className="font-medium text-foreground">
            Selected: {selectedPage.path}
            {recommendedPath === selectedPage.path && (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-violet-600/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                <Sparkles className="h-2.5 w-2.5" />
                Recommended
              </span>
            )}
          </p>
          <p className="mt-0.5 text-muted-foreground">{selectedPage.title}</p>
          {selectedPage.excerpt && (
            <p className="mt-1 line-clamp-2 text-muted-foreground">
              {selectedPage.excerpt}
            </p>
          )}
        </div>
      )}

      <div
        role="listbox"
        aria-label={label ?? "Crawled pages"}
        className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-1"
      >
        {allowAuto && (
          <button
            type="button"
            role="option"
            aria-selected={isAuto}
            disabled={disabled}
            onClick={() => onChange(autoValue)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
              isAuto
                ? "bg-violet-600 text-white"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <span className="font-medium">{autoLabel}</span>
          </button>
        )}

        {filteredPages.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            No pages match your search.
          </p>
        ) : (
          filteredPages.map((page) => {
            const pageValue = getPageValue(page, valueMode);
            const selected = value === pageValue;
            const role = classifySitePage(page);
            const isRecommended = recommendedPath === page.path;

            return (
              <button
                key={page.url}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onChange(pageValue)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  selected
                    ? "bg-violet-600 text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {page.path}
                      {page.path === "/" ? " (home)" : ""}
                    </p>
                    <p
                      className={`truncate text-xs ${
                        selected ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      {page.title}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        selected
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {PAGE_ROLE_LABELS[role]}
                    </span>
                    {isRecommended && !selected && (
                      <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
                        Recommended
                      </span>
                    )}
                  </div>
                </div>
                {!selected && page.excerpt && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {page.excerpt}
                  </p>
                )}
                {page.images.length > 0 && (
                  <p
                    className={`mt-1 text-[10px] ${
                      selected ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {page.images.length} image{page.images.length === 1 ? "" : "s"}
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {filteredPages.length} of {pages.length} pages
        {query ? ` matching “${query}”` : ""}
      </p>
    </div>
  );
}