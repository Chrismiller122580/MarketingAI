import * as cheerio from "cheerio";
import type { SiteImage } from "./types";

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

function resolveImageUrl(src: string, base: URL): string | null {
  try {
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

function isLikelyPhoto(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("logo") || lower.includes("icon") || lower.includes("favicon")) {
    return false;
  }
  if (lower.includes("sprite") || lower.includes("avatar") && lower.includes("32")) {
    return false;
  }
  return IMAGE_EXTENSIONS.test(lower) || lower.includes("/image") || lower.includes("cdn");
}

function scoreImage(
  source: SiteImage["source"],
  alt: string,
  width?: number,
  height?: number,
): number {
  let score = 0;
  if (source === "og") score += 100;
  if (source === "twitter") score += 90;
  if (source === "hero") score += 70;
  if (source === "content") score += 40;
  if (alt && alt.length > 3) score += 15;
  if (width && height) {
    const area = width * height;
    if (area > 200_000) score += 30;
    else if (area > 50_000) score += 15;
    const ratio = width / height;
    if (ratio >= 0.8 && ratio <= 1.91) score += 10;
  }
  return score;
}

export function extractImages(
  html: string,
  pageUrl: URL,
): SiteImage[] {
  const $ = cheerio.load(html);
  const images: SiteImage[] = [];
  const seen = new Set<string>();

  function add(
    src: string | undefined,
    alt: string,
    source: SiteImage["source"],
    width?: number,
    height?: number,
  ) {
    if (!src) return;
    const resolved = resolveImageUrl(src, pageUrl);
    if (!resolved || seen.has(resolved) || !isLikelyPhoto(resolved)) return;
    seen.add(resolved);

    images.push({
      url: resolved,
      alt: alt.trim(),
      source,
      pageUrl: pageUrl.href,
      pagePath: pageUrl.pathname === "/" ? "/" : pageUrl.pathname.replace(/\/$/, ""),
      score: scoreImage(source, alt, width, height),
    });
  }

  add($('meta[property="og:image"]').attr("content"), "Open Graph image", "og");
  add($('meta[name="twitter:image"]').attr("content"), "Twitter card image", "twitter");
  add($('link[rel="image_src"]').attr("href"), "Linked image", "og");

  $("img").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src") || $el.attr("data-src");
    const alt = $el.attr("alt") ?? "";
    const width = Number($el.attr("width")) || undefined;
    const height = Number($el.attr("height")) || undefined;
    const isHero =
      $el.closest("header, .hero, [class*='hero'], main > section:first-child")
        .length > 0 || (width && width > 400);
    add(src, alt, isHero ? "hero" : "content", width, height);
  });

  return images.sort((a, b) => b.score - a.score);
}

export function dedupeImages(images: SiteImage[]): SiteImage[] {
  const map = new Map<string, SiteImage>();
  for (const img of images) {
    const existing = map.get(img.url);
    if (!existing || img.score > existing.score) {
      map.set(img.url, img);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}