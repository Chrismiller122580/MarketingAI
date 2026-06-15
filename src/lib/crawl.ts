import * as cheerio from "cheerio";
import { analyzeBrand } from "./brand-analyzer";
import { dedupeImages, extractImages } from "./image-extractor";
import { fetchSitemapUrls } from "./sitemap";
import type { SiteData, SitePage } from "./types";

const MAX_PAGES = 25;
const FETCH_TIMEOUT_MS = 10_000;

async function isAllowedByRobots(origin: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": "CrawlSpark-Crawler/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return true; // absence of robots.txt means allowed
    const txt = await res.text();
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^Disallow:\s*(\S*)/i);
      if (m) {
        const rule = m[1] || "";
        if (rule === "/" || (rule && path.startsWith(rule))) {
          return false;
        }
      }
    }
    return true;
  } catch {
    return true; // on error, be permissive but log would be ideal in prod
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
        "User-Agent": "CrawlSpark-Crawler/1.0",
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

  const sitemapUrls = await fetchSitemapUrls(origin);
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
    if (!(await isAllowedByRobots(origin, pageUrl.pathname))) continue;

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

  return {
    domain: origin,
    crawledAt: new Date().toISOString(),
    brand: analyzeBrand(origin, sortedPages, themeColor),
    pages: sortedPages,
    images: allImages,
  };
}