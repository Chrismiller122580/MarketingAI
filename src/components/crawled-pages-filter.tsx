"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
  compact?: boolean;
  defaultExpanded?: boolean;
};

const CHIP_CLASS =
  "shrink-0 snap-start rounded-full px-3 py-2 text-xs font-medium transition min-h-10 sm:min-h-0 sm:px-2.5 sm:py-1";

export function CrawledPagesFilter({
  pages,
  selectedPaths,
  onChange,
  recommendedPath,
  label = "Campaign pages",
  hint = "Leave all selected to rotate across every crawled page, or narrow to specific pages.",
  className = "",
  compact = false,
  defaultExpanded,
}: CrawledPagesFilterProps) {
  const isMobile = useIsMobile();
  const useCompact = compact || isMobile;
  const startsCollapsed = defaultExpanded === undefined ? useCompact : !defaultExpanded;
  const [expanded, setExpanded] = useState(!startsCollapsed);
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

  const summaryText = allSelected
    ? `All ${pages.length} pages`
    : `${selectedPaths.length} of ${pages.length} pages selected`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && (
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
              {hint}
            </p>
          )}
        </div>
        {!useCompact || expanded ? (
          <div className="flex gap-2 sm:shrink-0">
            <button
              type="button"
              onClick={selectAll}
              className="min-h-10 flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-violet-600 transition hover:bg-muted sm:min-h-0 sm:flex-none sm:border-0 sm:px-0 sm:py-0"
            >
              All pages
            </button>
            <button
              type="button"
              onClick={selectFiltered}
              className="min-h-10 flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-violet-600 transition hover:bg-muted sm:min-h-0 sm:flex-none sm:border-0 sm:px-0 sm:py-0"
            >
              Filtered only
            </button>
          </div>
        ) : null}
      </div>

      {useCompact && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 flex w-full min-h-11 items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-left text-sm transition hover:bg-muted"
        >
          <span className="font-medium text-foreground">{summaryText}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <>
          {useCompact && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-3 text-xs font-medium text-violet-600 hover:text-violet-500"
            >
              Done
            </button>
          )}

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-base sm:py-2 sm:text-sm"
            />
          </div>

          <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {roleFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setRoleFilter(filter.value)}
                className={`${CHIP_CLASS} ${
                  roleFilter === filter.value
                    ? "bg-violet-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-3 max-h-[40vh] space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 sm:max-h-48">
            {filteredPages.map((page) => {
              const checked = allSelected || selectedSet.has(page.path);
              const role = classifySitePage(page);

              return (
                <label
                  key={page.url}
                  className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted sm:py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePath(page.path)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-border text-violet-600"
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-medium text-foreground">
                      {page.path}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {page.title}
                      </span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {PAGE_ROLE_LABELS[role]}
                      </span>
                      {recommendedPath === page.path && (
                        <span className="text-[10px] font-medium text-violet-600">
                          Recommended
                        </span>
                      )}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">{summaryText}</p>
        </>
      )}
    </div>
  );
}