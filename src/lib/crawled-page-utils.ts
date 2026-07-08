import type { SiteData, SitePage } from "./types";
import {
  classifySitePage,
  pickBestPageForFacts,
  type SitePageRole,
} from "./viraforge/site-facts-extractor";

export type PageRoleFilter = SitePageRole | "all";

export const PAGE_ROLE_LABELS: Record<SitePageRole, string> = {
  home: "Home",
  product: "Product",
  pricing: "Pricing",
  about: "About",
  contact: "Contact",
  other: "Other",
};

export const PAGE_ROLE_FILTERS: { value: PageRoleFilter; label: string }[] = [
  { value: "all", label: "All pages" },
  { value: "home", label: "Home" },
  { value: "product", label: "Product" },
  { value: "pricing", label: "Pricing" },
  { value: "about", label: "About" },
  { value: "contact", label: "Contact" },
  { value: "other", label: "Other" },
];

export function getPageValue(page: SitePage, mode: "path" | "url"): string {
  return mode === "url" ? page.url : page.path;
}

export function findPageByValue(
  pages: SitePage[],
  value: string,
  mode: "path" | "url" = "path",
): SitePage | undefined {
  if (!value || value === "all") return undefined;
  return pages.find((p) => getPageValue(p, mode) === value);
}

export function recommendSourcePage(site: SiteData): SitePage | undefined {
  return pickBestPageForFacts(site);
}

export function filterCrawledPages(
  pages: SitePage[],
  query: string,
  roleFilter: PageRoleFilter = "all",
): SitePage[] {
  const q = query.trim().toLowerCase();

  return pages.filter((page) => {
    if (roleFilter !== "all" && classifySitePage(page) !== roleFilter) {
      return false;
    }

    if (!q) return true;

    const haystack = [
      page.path,
      page.title,
      page.description,
      page.excerpt,
      ...page.headings,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function sortCrawledPages(
  pages: SitePage[],
  recommendedPath?: string,
): SitePage[] {
  return [...pages].sort((a, b) => {
    if (recommendedPath) {
      if (a.path === recommendedPath) return -1;
      if (b.path === recommendedPath) return 1;
    }
    return a.path.localeCompare(b.path);
  });
}