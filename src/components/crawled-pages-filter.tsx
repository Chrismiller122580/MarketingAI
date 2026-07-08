"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  filterCrawledPages,
  PAGE_ROLE_FILTERS,
  PAGE_ROLE_LABELS,
  sortCrawledPages,
  type PageRoleFilter,
} from "@/lib/crawled-page-utils";
import { classifySitePage } from "@/lib/viraforge/site-facts-extractor";
import type { SitePage } from "@/lib/types";

export type CrawledPagesFilterProps = {
  pages: SitePage[];
  selectedPaths: string[];
  onChange: (paths: string[]) => void;
  recommendedPath?: string;
  label?: string;
  hint?: string;
  className?: string;
};

export function CrawledPagesFilter({
  pages,
  selectedPaths,
  onChange,
  recommendedPath,
  label = "Campaign pages",
  hint = "Leave all selected to rotate across every crawled page, or narrow to specific pages.",
  className = "",
}: CrawledPagesFilterProps) {
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

  const roleFilters = useMemo(() => {
    const roles = new Set(pages.map((p) => classifySitePage(p)));
    return PAGE_ROLE_FILTERS.filter(
      (f) => f.value === "all" || roles.has(f.value as Exclude<PageRoleFilter, "all">),
    );
  }, [pages]);

  const allSelected = selectedPaths.length === 0;
  const selectedSet = new Set(selectedPaths);

  function togglePath(path: string) {
    if (allSelected) {
      onChange(pages.map((p) => p.path).filter((p) => p !== path));
      return;
    }

    if (selectedSet.has(path)) {
      const next = selectedPaths.filter((p) => p !== path);
      onChange(next.length === pages.length ? [] : next);
    } else {
      const next = [...selectedPaths, path];
      onChange(next.length === pages.length ? [] : next);
    }
  }

  function selectAll() {
    onChange([]);
  }

  function selectFiltered() {
    const paths = filteredPages.map((p) => p.path);
    onChange(paths.length === pages.length ? [] : paths);
  }

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-medium text-violet-600 hover:text-violet-500"
          >
            All pages
          </button>
          <button
            type="button"
            onClick={selectFiltered}
            className="text-xs font-medium text-violet-600 hover:text-violet-500"
          >
            Filtered only
          </button>
        </div>
      </div>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages…"
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {roleFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setRoleFilter(filter.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === filter.value
                ? "bg-violet-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2">
        {filteredPages.map((page) => {
          const checked = allSelected || selectedSet.has(page.path);
          const role = classifySitePage(page);

          return (
            <label
              key={page.url}
              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => togglePath(page.path)}
                className="mt-0.5 rounded border-border text-violet-600"
              />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-foreground">{page.path}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {page.title}
                </span>
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  {PAGE_ROLE_LABELS[role]}
                </span>
                {recommendedPath === page.path && (
                  <span className="ml-1 text-[10px] font-medium text-violet-600">
                    Recommended
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {allSelected
          ? `Using all ${pages.length} crawled pages`
          : `${selectedPaths.length} of ${pages.length} pages selected`}
      </p>
    </div>
  );
}