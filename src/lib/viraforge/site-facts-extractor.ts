import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";
import type { SiteData, SitePage } from "@/lib/types";

export type FactPinpoint = {
  fact: string;
  source: string;
  category: "name" | "price" | "feature" | "location" | "hours" | "ingredient";
  locked: boolean;
};

const PRICE_PATTERN =
  /\$\s?\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s?(?:USD|usd)/g;

function uniqueStrings(items: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || trimmed.length < 3) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function extractPrices(text: string): string[] {
  return uniqueStrings(text.match(PRICE_PATTERN) ?? [], 3);
}

function extractFeaturesFromPage(page: SitePage): string[] {
  const candidates = [
    ...page.headings,
    ...page.excerpt
      .split(/[•\-\n|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12 && s.length < 120),
  ];
  return uniqueStrings(candidates, 8);
}

export function extractCrawledProductFacts(
  site: SiteData,
  page?: SitePage,
): Partial<ProductFactsForm> {
  const target = page ?? site.pages[0];
  if (!target) return {};

  const corpus = site.pages
    .slice(0, 8)
    .map((p) => `${p.title} ${p.description} ${p.excerpt} ${p.headings.join(" ")}`)
    .join("\n");

  const prices = extractPrices(corpus);
  const features = extractFeaturesFromPage(target);

  const locationMatch = corpus.match(
    /(?:located in|based in|serving|visit us at)\s+([A-Z][^.!\n]{4,60})/i,
  );

  const hoursMatch = corpus.match(
    /(?:hours?|open)\s*[:\-]?\s*([^\n.]{6,60})/i,
  );

  return {
    name: target.title || site.brand.name,
    price: prices[0] ?? "",
    features: features.length > 0 ? features : [site.brand.tagline || site.brand.name],
    location: locationMatch?.[1]?.trim(),
    hours: hoursMatch?.[1]?.trim(),
  };
}

export function buildFactPinpoints(
  locked: ProductFactsForm,
  site: SiteData,
  page?: SitePage,
): FactPinpoint[] {
  const target = page ?? site.pages[0];
  const pageLabel = target ? `${site.domain}${target.path}` : site.domain;
  const pinpoints: FactPinpoint[] = [];

  pinpoints.push({
    fact: locked.name,
    source: "locked product facts",
    category: "name",
    locked: true,
  });

  if (locked.price) {
    pinpoints.push({
      fact: locked.price,
      source: "locked product facts",
      category: "price",
      locked: true,
    });
  }

  for (const feature of locked.features) {
    pinpoints.push({
      fact: feature,
      source: "locked product facts",
      category: "feature",
      locked: true,
    });
  }

  if (locked.location) {
    pinpoints.push({
      fact: locked.location,
      source: "locked product facts",
      category: "location",
      locked: true,
    });
  }

  if (locked.hours) {
    pinpoints.push({
      fact: locked.hours,
      source: "locked product facts",
      category: "hours",
      locked: true,
    });
  }

  for (const ingredient of locked.ingredients ?? []) {
    pinpoints.push({
      fact: ingredient,
      source: "locked product facts",
      category: "ingredient",
      locked: true,
    });
  }

  const crawled = extractCrawledProductFacts(site, target);

  for (const feature of crawled.features ?? []) {
    const duplicate = pinpoints.some(
      (p) => p.fact.toLowerCase() === feature.toLowerCase(),
    );
    if (!duplicate) {
      pinpoints.push({
        fact: feature,
        source: pageLabel,
        category: "feature",
        locked: false,
      });
    }
  }

  if (crawled.price && !pinpoints.some((p) => p.category === "price")) {
    pinpoints.push({
      fact: crawled.price,
      source: pageLabel,
      category: "price",
      locked: false,
    });
  }

  if (
    crawled.location &&
    !pinpoints.some((p) => p.category === "location")
  ) {
    pinpoints.push({
      fact: crawled.location,
      source: pageLabel,
      category: "location",
      locked: false,
    });
  }

  if (crawled.hours && !pinpoints.some((p) => p.category === "hours")) {
    pinpoints.push({
      fact: crawled.hours,
      source: pageLabel,
      category: "hours",
      locked: false,
    });
  }

  return pinpoints;
}

export function mergeFactsWithSite(
  locked: ProductFactsForm,
  site: SiteData,
  page?: SitePage,
): ProductFactsForm {
  const crawled = extractCrawledProductFacts(site, page);
  const mergedFeatures = uniqueStrings(
    [...locked.features, ...(crawled.features ?? [])],
    12,
  );

  return {
    ...locked,
    name: locked.name || crawled.name || site.brand.name,
    price: locked.price || crawled.price || "",
    features: mergedFeatures.length > 0 ? mergedFeatures : locked.features,
    location: locked.location || crawled.location,
    hours: locked.hours || crawled.hours,
    ingredients: locked.ingredients,
  };
}