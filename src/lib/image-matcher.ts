import type { Platform, SiteData, SiteImage, SitePage } from "./types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function relevanceScore(
  image: SiteImage,
  context: string,
  page?: SitePage,
): number {
  const contextTokens = new Set(tokenize(context));
  const imageTokens = tokenize(`${image.alt} ${image.pagePath}`);
  let overlap = 0;
  for (const token of imageTokens) {
    if (contextTokens.has(token)) overlap += 2;
  }

  let score = image.score + overlap;
  if (page && image.pageUrl === page.url) score += 50;
  if (image.source === "og") score += 20;
  if (image.source === "hero") score += 10;
  return score;
}

const platformBonus: Partial<Record<Platform, (img: SiteImage) => number>> = {
  instagram: () => 5,
  pinterest: () => 8,
};

export function pickBestImage(
  site: SiteData,
  context: string,
  page?: SitePage,
  platform?: Platform,
): SiteImage | null {
  const candidates = page
    ? [...page.images, ...site.images.filter((i) => i.pageUrl !== page.url)]
    : site.images;

  if (candidates.length === 0) return null;

  const scored = candidates.map((img) => {
    let score = relevanceScore(img, context, page);
    if (platform && platformBonus[platform]) {
      score += platformBonus[platform]!(img);
    }
    return { img, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.img ?? null;
}

export function buildBrandedImageUrl(
  site: SiteData,
  title: string,
  platform: Platform,
  pagePath?: string,
): string {
  const params = new URLSearchParams({
    title,
    brand: site.brand.name,
    tagline: site.brand.tagline.slice(0, 80),
    color: site.brand.themeColor.replace("#", ""),
    platform,
    domain: new URL(site.domain).hostname,
  });
  if (pagePath) params.set("path", pagePath);
  return `/api/og/post?${params.toString()}`;
}