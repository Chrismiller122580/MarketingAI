import { prisma } from "@/lib/db";
import { siteToData } from "@/lib/db-mappers";
import type {
  CrawledCorpus,
  CrawledCorpusPage,
  SiteData,
  SitePage,
} from "@/lib/types";
import { extractCrawledProductFacts } from "@/lib/viraforge/site-facts-extractor";

const MAX_SITES = 8;
const MAX_PAGES_PER_SITE = 16;
const SUMMARY_LEN = 220;
const PROMPT_LIMIT = 8000;

export type CorpusPageHit = {
  site: SiteData;
  page: SitePage;
};

function pageSummary(page: SitePage): string {
  const text = (
    page.description ||
    page.excerpt ||
    page.headings.slice(0, 3).join(". ")
  )
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= SUMMARY_LEN) return text;
  return `${text.slice(0, SUMMARY_LEN - 1).trimEnd()}…`;
}

export async function loadUserCrawledSites(
  userId: string,
  primary?: SiteData | null,
): Promise<SiteData[]> {
  const rows = await prisma.site.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: MAX_SITES,
  });
  const byDomain = new Map(
    rows.map((row) => [row.domain.toLowerCase(), siteToData(row)] as const),
  );
  if (primary?.pages?.length) {
    byDomain.set(primary.domain.toLowerCase(), primary);
  }

  const sites = [...byDomain.values()].filter((site) => site.pages.length > 0);
  if (!primary) return sites;

  const primaryDomain = primary.domain.toLowerCase();
  return sites.sort((a, b) => {
    if (a.domain.toLowerCase() === primaryDomain) return -1;
    if (b.domain.toLowerCase() === primaryDomain) return 1;
    return 0;
  });
}

export function corpusSites(
  primary: SiteData,
  corpus?: CrawledCorpus | null,
): SiteData[] {
  const byDomain = new Map<string, SiteData>();
  byDomain.set(primary.domain.toLowerCase(), primary);
  for (const site of corpus?.sites ?? []) {
    if (!site.pages.length) continue;
    const key = site.domain.toLowerCase();
    if (!byDomain.has(key)) byDomain.set(key, site);
  }
  return [...byDomain.values()];
}

export function flattenCorpusPages(sites: SiteData[]): CorpusPageHit[] {
  const out: CorpusPageHit[] = [];
  for (const site of sites) {
    for (const page of site.pages.slice(0, MAX_PAGES_PER_SITE)) {
      out.push({ site, page });
    }
  }
  return out;
}

export function findPageInSites(
  sites: SiteData[],
  opts: { url?: string; path?: string; domain?: string },
): CorpusPageHit | undefined {
  const domain = opts.domain?.toLowerCase();
  const list = domain
    ? sites.filter((site) => site.domain.toLowerCase() === domain)
    : sites;
  const path = opts.path
    ? opts.path.startsWith("/")
      ? opts.path
      : `/${opts.path}`
    : undefined;

  for (const site of list) {
    const page = site.pages.find((row) => {
      if (opts.url && (row.url === opts.url || row.path === opts.url)) {
        return true;
      }
      if (path && row.path === path) return true;
      return false;
    });
    if (page) return { site, page };
  }
  return undefined;
}

export function buildCrawledCorpus(sites: SiteData[]): CrawledCorpus {
  const pages: CrawledCorpusPage[] = [];
  const offerings = new Set<string>();
  const prices = new Set<string>();
  const features = new Set<string>();
  const locations = new Set<string>();
  const hours = new Set<string>();

  for (const site of sites) {
    for (const page of site.pages.slice(0, MAX_PAGES_PER_SITE)) {
      pages.push({
        domain: site.domain,
        brandName: site.brand.name,
        path: page.path,
        title: page.title,
        summary: pageSummary(page),
        headings: page.headings.slice(0, 6),
      });
      const crawled = extractCrawledProductFacts(site, page);
      if (crawled.name) offerings.add(crawled.name);
      if (crawled.price) prices.add(crawled.price);
      for (const feature of crawled.features ?? []) features.add(feature);
      if (crawled.location) locations.add(crawled.location);
      if (crawled.hours) hours.add(crawled.hours);
    }
  }

  const grouped = sites.map((site) => {
    const sitePages = pages.filter((page) => page.domain === site.domain);
    const lines = sitePages.map((page) => {
      const pathLabel = page.path === "/" ? "home" : page.path;
      const extra = page.headings.length
        ? ` | ${page.headings.join("; ")}`
        : "";
      return `- ${pathLabel}: ${page.title}${
        page.summary ? ` — ${page.summary}` : ""
      }${extra}`;
    });
    return `## ${site.brand.name} (${site.domain})
Tagline: ${site.brand.tagline || "n/a"}
${lines.join("\n")}`;
  });

  const factLines = [
    offerings.size
      ? `Offerings: ${[...offerings].slice(0, 12).join("; ")}`
      : "",
    prices.size
      ? `Prices found on the crawled pages: ${[...prices].slice(0, 8).join("; ")}`
      : "",
    features.size
      ? `Features and proof from crawl: ${[...features].slice(0, 16).join("; ")}`
      : "",
    locations.size
      ? `Locations: ${[...locations].slice(0, 6).join("; ")}`
      : "",
    hours.size ? `Hours: ${[...hours].slice(0, 6).join("; ")}` : "",
  ].filter(Boolean);

  const promptBlock = `CRAWLED SOURCE OF TRUTH (${sites.length} site${
    sites.length === 1 ? "" : "s"
  }, ${pages.length} page${pages.length === 1 ? "" : "s"}).
Only use facts that appear below. Do not invent prices, specs, hours, ingredients, or claims.
${grouped.join("\n\n")}
${factLines.length ? `\nVerified from crawl:\n${factLines.join("\n")}` : ""}`.slice(
    0,
    PROMPT_LIMIT,
  );

  return {
    sites,
    siteCount: sites.length,
    pageCount: pages.length,
    promptBlock,
    pages,
  };
}

export async function loadCrawledCorpus(
  userId: string,
  primary?: SiteData | null,
): Promise<CrawledCorpus> {
  const sites = await loadUserCrawledSites(userId, primary);
  return buildCrawledCorpus(sites);
}

export function siteForPage(
  sites: SiteData[],
  page: SitePage,
): SiteData | undefined {
  return sites.find((site) =>
    site.pages.some((row) => row.url === page.url || row.path === page.path),
  );
}
