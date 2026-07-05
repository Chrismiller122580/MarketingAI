import * as cheerio from "cheerio";
import { analyzeBrand } from "./brand-analyzer";
import { synthesizeBrand } from "./brand-synthesis";
import { embedPages } from "./embeddings";
import { dedupeImages, extractImages } from "./image-extractor";
import { fetchSitemapUrls } from "./sitemap";
import type { SiteData, SitePage } from "./types";

const MAX_PAGES = 25;
const FETCH_TIMEOUT_MS = 10_000;
const CRAWLER_USER_AGENT = "CrawlSpark-Crawler/1.0";

type RobotsGroup = {
  agents: string[];
  allow: string[];
  disallow: string[];
};

function parseRobotsGroups(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;

  const flush = () => {
    if (current) {
      groups.push(current);
      current = null;
    }
  };

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const uaMatch = line.match(/^User-agent:\s*(.+)$/i);
    if (uaMatch) {
      const agent = uaMatch[1].trim().toLowerCase();
      if (
        current &&
        (current.allow.length > 0 || current.disallow.length > 0)
      ) {
        flush();
      }
      if (current) {
        current.agents.push(agent);
      } else {
        current = { agents: [agent], allow: [], disallow: [] };
      }
      continue;
    }

    if (!current) continue;

    const allowMatch = line.match(/^Allow:\s*(\S*)/i);
    if (allowMatch) {
      current.allow.push(allowMatch[1] ?? "");
      continue;
    }

    const disallowMatch = line.match(/^Disallow:\s*(\S*)/i);
    if (disallowMatch) {
      current.disallow.push(disallowMatch[1] ?? "");
    }
  }

  flush();
  return groups;
}

function agentMatchesPattern(pattern: string, userAgent: string): boolean {
  if (pattern === "*") return true;
  const ua = userAgent.toLowerCase();
  const token = ua.split("/")[0];
  return ua.includes(pattern) || pattern.includes(token);
}

function findApplicableRobotsRules(
  groups: RobotsGroup[],
  userAgent: string,
): Pick<RobotsGroup, "allow" | "disallow"> {
  let bestSpecificity = -1;
  const specificAllow: string[] = [];
  const specificDisallow: string[] = [];
  const wildcardAllow: string[] = [];
  const wildcardDisallow: string[] = [];

  for (const group of groups) {
    for (const agent of group.agents) {
      if (!agentMatchesPattern(agent, userAgent)) continue;

      if (agent === "*") {
        wildcardAllow.push(...group.allow);
        wildcardDisallow.push(...group.disallow);
      } else {
        const specificity = agent.length;
        if (specificity > bestSpecificity) {
          bestSpecificity = specificity;
          specificAllow.length = 0;
          specificDisallow.length = 0;
        }
        if (specificity === bestSpecificity) {
          specificAllow.push(...group.allow);
          specificDisallow.push(...group.disallow);
        }
      }
    }
  }

  if (bestSpecificity > 0) {
    return { allow: specificAllow, disallow: specificDisallow };
  }

  return { allow: wildcardAllow, disallow: wildcardDisallow };
}

function isPathAllowedByRules(
  path: string,
  rules: Pick<RobotsGroup, "allow" | "disallow">,
): boolean {
  let longestAllow = -1;
  let longestDisallow = -1;

  for (const rule of rules.allow) {
    if (path.startsWith(rule) && rule.length > longestAllow) {
      longestAllow = rule.length;
    }
  }

  for (const rule of rules.disallow) {
    if (!rule) continue;
    if (path.startsWith(rule) && rule.length > longestDisallow) {
      longestDisallow = rule.length;
    }
  }

  if (longestAllow === -1 && longestDisallow === -1) return true;
  return longestAllow >= longestDisallow;
}

function isPathAllowedByRobots(
  path: string,
  groups: RobotsGroup[],
  userAgent = CRAWLER_USER_AGENT,
): boolean {
  const rules = findApplicableRobotsRules(groups, userAgent);
  if (rules.allow.length === 0 && rules.disallow.length === 0) return true;
  return isPathAllowedByRules(path, rules);
}

async function fetchRobotsGroups(origin: string): Promise<RobotsGroup[]> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": CRAWLER_USER_AGENT },
      redirect: "follow",
    });
    if (!res.ok) return [];
    return parseRobotsGroups(await res.text());
  } catch {
    return [];
  }
}

const SKIP_EXTENSIONS = new Set([
  ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
  ".css", ".js", ".zip", ".mp4", ".mp3", ".woff", ".woff2",
]);

export function normalizeDomain(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Domain is required");

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(withProtocol);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  return url.origin;
}

function shouldSkipUrl(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  const extension = path.slice(path.lastIndexOf("."));
  if (SKIP_EXTENSIONS.has(extension)) return true;
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  return false;
}

function resolveUrl(href: string, base: URL): URL | null {
  try {
    const resolved = new URL(href, base);
    resolved.hash = "";
    return resolved;
  } catch {
    return null;
  }
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractThemeColor(html: string): string | undefined {
  const $ = cheerio.load(html);
  const theme =
    $('meta[name="theme-color"]').attr("content") ||
    $('meta[name="msapplication-TileColor"]').attr("content");
  if (theme && /^#[0-9a-fA-F]{3,8}$/.test(theme)) return theme;
  return undefined;
}

function extractPage(html: string, pageUrl: URL): SitePage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  const title = cleanText($("title").first().text()) || pageUrl.pathname;
  const description =
    cleanText($('meta[name="description"]').attr("content") ?? "") ||
    cleanText($('meta[property="og:description"]').attr("content") ?? "");

  const headings = $("h1, h2, h3")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)
    .slice(0, 8);

  const bodyText = cleanText(
    $("main, article, [role='main']").first().text() || $("body").text(),
  );

  const excerpt = bodyText.slice(0, 400) + (bodyText.length > 400 ? "…" : "");
  const images = extractImages(html, pageUrl);
  const ogImage = images.find((i) => i.source === "og")?.url;

  return {
    url: pageUrl.href,
    path: pageUrl.pathname === "/" ? "/" : pageUrl.pathname.replace(/\/$/, ""),
    title,
    description,
    headings,
    excerpt,
    images,
    ogImage,
  };
}

function extractLinks(html: string, pageUrl: URL, origin: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const resolved = resolveUrl(href, pageUrl);
    if (!resolved || resolved.origin !== origin) return;
    if (shouldSkipUrl(resolved)) return;
    links.add(resolved.href);
  });

  return Array.from(links);
}

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": CRAWLER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Unsupported content type for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function crawlDomain(domainInput: string): Promise<SiteData> {
  const origin = normalizeDomain(domainInput);
  const startUrl = new URL("/", origin).href;

  const [sitemapUrls, robotsGroups] = await Promise.all([
    fetchSitemapUrls(origin),
    fetchRobotsGroups(origin),
  ]);
  const visited = new Set<string>();
  const queue = [
    startUrl,
    ...sitemapUrls.filter((u) => u !== startUrl).slice(0, MAX_PAGES - 1),
  ];
  const pages: SitePage[] = [];
  let themeColor: string | undefined;

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const nextUrl = queue.shift();
    if (!nextUrl || visited.has(nextUrl)) continue;

    const pageUrl = new URL(nextUrl);
    if (!isPathAllowedByRobots(pageUrl.pathname, robotsGroups)) continue;

    visited.add(nextUrl);

    try {
      const html = await fetchPage(nextUrl);

      if (!themeColor) themeColor = extractThemeColor(html);

      const page = extractPage(html, pageUrl);
      pages.push(page);

      const links = extractLinks(html, pageUrl, origin);
      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    } catch {
      if (pages.length === 0 && nextUrl === startUrl) {
        throw new Error(
          `Could not reach ${origin}. Check the domain and try again.`,
        );
      }
    }
  }

  if (pages.length === 0) {
    throw new Error("No pages could be crawled from this domain.");
  }

  const sortedPages = pages.sort((a, b) => a.path.localeCompare(b.path));
  const allImages = dedupeImages(sortedPages.flatMap((p) => p.images));

  const heuristicBrand = analyzeBrand(origin, sortedPages, themeColor);
  const [brand, embeddedPages] = await Promise.all([
    synthesizeBrand(heuristicBrand, sortedPages),
    embedPages(sortedPages),
  ]);

  return {
    domain: origin,
    crawledAt: new Date().toISOString(),
    brand,
    pages: embeddedPages,
    images: allImages,
  };
}