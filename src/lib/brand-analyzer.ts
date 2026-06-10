import type { BrandProfile, SitePage } from "./types";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "your", "our", "from", "that", "this", "are",
  "was", "have", "has", "will", "can", "all", "more", "about", "into", "over",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

function topKeywords(pages: SitePage[], limit = 12): string[] {
  const counts = new Map<string, number>();

  for (const page of pages) {
    const tokens = [
      ...tokenize(page.title),
      ...tokenize(page.description),
      ...page.headings.flatMap(tokenize),
    ];
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function detectTone(pages: SitePage[]): string {
  const corpus = pages
    .map((p) => `${p.title} ${p.description} ${p.excerpt}`)
    .join(" ")
    .toLowerCase();

  if (/enterprise|solution|platform|scale|business/i.test(corpus)) {
    return "Professional & authoritative";
  }
  if (/fun|love|awesome|exciting|community/i.test(corpus)) {
    return "Friendly & energetic";
  }
  if (/innovative|future|transform|cutting-edge/i.test(corpus)) {
    return "Bold & innovative";
  }
  return "Clear & approachable";
}

export function analyzeBrand(
  domain: string,
  pages: SitePage[],
  themeColor?: string,
): BrandProfile {
  const home = pages.find((p) => p.path === "/") ?? pages[0];
  const hostname = new URL(domain).hostname.replace(/^www\./, "");
  const brandName =
    home.title.split(/[|\-–—]/)[0]?.trim() || hostname;

  const tagline =
    home.description ||
    home.headings[0] ||
    home.excerpt.slice(0, 120);

  const topics = pages
    .flatMap((p) => p.headings.slice(0, 2))
    .filter(Boolean)
    .slice(0, 8);

  return {
    name: brandName,
    tagline,
    keywords: topKeywords(pages),
    tone: detectTone(pages),
    topics,
    themeColor: themeColor || "#4f46e5",
  };
}