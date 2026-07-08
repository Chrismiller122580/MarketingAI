import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";
import type { BusinessModelType, SiteData, SitePage } from "@/lib/types";

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

export type SitePageRole = "home" | "pricing" | "about" | "contact" | "product" | "other";

export function classifySitePage(page: SitePage): SitePageRole {
  const hay = `${page.path} ${page.title} ${page.description}`.toLowerCase();
  if (/\/(pricing|plans|packages|rates)/.test(page.path) || /pricing|plans/.test(hay)) {
    return "pricing";
  }
  if (/\/(contact|locations?|visit)/.test(page.path) || /contact|visit us|hours/.test(hay)) {
    return "contact";
  }
  if (/\/(about|team|story|who-we-are)/.test(page.path) || /about us|our story/.test(hay)) {
    return "about";
  }
  if (/\/(product|shop|menu|services?)/.test(page.path) || /product|menu|services/.test(hay)) {
    return "product";
  }
  if (page.path === "/" || page.path === "") return "home";
  return "other";
}

export function pickBestPageForFacts(
  site: SiteData,
  preferredPath?: string,
): SitePage | undefined {
  if (preferredPath) {
    const match =
      site.pages.find((p) => p.path === preferredPath) ??
      site.pages.find((p) => p.url === preferredPath);
    if (match) return match;
  }

  const byRole = (role: SitePageRole) =>
    site.pages.find((p) => classifySitePage(p) === role);

  return (
    byRole("product") ??
    byRole("pricing") ??
    byRole("home") ??
    site.pages.find((p) => p.path === "/") ??
    site.pages[0]
  );
}

export function extractCrawledProductFacts(
  site: SiteData,
  page?: SitePage,
): Partial<ProductFactsForm> {
  const target = page ?? pickBestPageForFacts(site);
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

export type ProductFactFieldMeta = {
  show: boolean;
  label: string;
  placeholder?: string;
  hint?: string;
};

export type ProductFactFieldsConfig = {
  siteType: BusinessModelType;
  siteLabel: string;
  summary: string;
  name: ProductFactFieldMeta;
  features: ProductFactFieldMeta;
  price: ProductFactFieldMeta;
  location: ProductFactFieldMeta;
  hours: ProductFactFieldMeta;
  ingredients: ProductFactFieldMeta;
};

function siteCorpus(site: SiteData): string {
  return site.pages
    .slice(0, 10)
    .map((p) => `${p.path} ${p.title} ${p.description} ${p.excerpt} ${p.headings.join(" ")}`)
    .concat(site.brand.topics, site.brand.tagline)
    .join(" ")
    .toLowerCase();
}

function siteTypeLabel(type: BusinessModelType): string {
  const labels: Record<BusinessModelType, string> = {
    saas: "software",
    ecommerce: "online store",
    services: "services business",
    agency: "agency",
    media: "media / content",
    local: "local business",
    nonprofit: "nonprofit",
    other: "site",
  };
  return labels[type];
}

const GENERIC_FACT_PRICES = new Set([
  "Contact for pricing",
  "Donations / free access",
  "Free / subscription",
  "See website for pricing",
]);

export function isGenericFactPrice(price: string): boolean {
  return GENERIC_FACT_PRICES.has(price.trim());
}

export function factsTabLabel(
  siteType: BusinessModelType,
  hasSite = true,
): string {
  if (!hasSite) return "Product Facts";
  if (siteType === "local") return "Business Facts";
  if (siteType === "agency" || siteType === "media" || siteType === "nonprofit") {
    return "Brand Facts";
  }
  return "Product Facts";
}

export function defaultPriceForHiddenField(type: BusinessModelType): string {
  switch (type) {
    case "saas":
    case "agency":
    case "services":
      return "Contact for pricing";
    case "nonprofit":
      return "Donations / free access";
    case "media":
      return "Free / subscription";
    default:
      return "See website for pricing";
  }
}

export function inferProductFactFields(site?: SiteData | null): ProductFactFieldsConfig {
  if (!site) {
    return {
      siteType: "other",
      siteLabel: "your site",
      summary: "Crawl a site to tailor which fields appear for that business.",
      name: {
        show: true,
        label: "Product name",
        placeholder: "Your product or business name",
      },
      features: {
        show: true,
        label: "Features (one per line)",
        placeholder: "One highlight per line",
      },
      price: {
        show: true,
        label: "Price",
        placeholder: "$49.99",
      },
      location: {
        show: true,
        label: "Business location",
        placeholder: "City, neighborhood, or address",
      },
      hours: {
        show: true,
        label: "Hours of operation",
        placeholder: "Mon–Sat 9am–6pm",
      },
      ingredients: {
        show: true,
        label: "Ingredients (one per line)",
      },
    };
  }

  const type = site.brand.businessModel?.type ?? "other";
  const siteLabel = site.brand.name;
  const hay = siteCorpus(site);
  const crawled = site ? extractCrawledProductFacts(site) : {};

  const hasPricingPage =
    site?.pages.some((page) => classifySitePage(page) === "pricing") ?? false;
  const hasContactPage =
    site?.pages.some((page) => classifySitePage(page) === "contact") ?? false;
  const hasMenuPage =
    site?.pages.some((page) => /menu|shop|products?/i.test(page.path)) ?? false;

  const isFood = /restaurant|menu|cafe|bakery|food|kitchen|recipe|dining|bar\b|coffee|pizza|sushi|cuisine|chef/.test(
    hay,
  );
  const isBeauty = /skincare|cosmetic|beauty|serum|makeup|fragrance|spa\b|salon/.test(hay);
  const isSupplement = /supplement|protein|vitamin|nutrition|wellness product|powder/.test(
    hay,
  );
  const isPhysicalLocal =
    type === "local" ||
    /visit us|near me|in-person|walk-?in|store hours|our location/.test(hay);

  const showPrice =
    type === "ecommerce" ||
    type === "local" ||
    hasPricingPage ||
    Boolean(crawled.price) ||
    (type === "services" && /\$|pricing|rates|starting at|per month/.test(hay));

  const showLocation =
    isPhysicalLocal ||
    Boolean(crawled.location) ||
    (hasContactPage && type === "services");

  const showHours =
    isPhysicalLocal ||
    Boolean(crawled.hours) ||
    /hours of operation|open (daily|mon|sun)|mon.?fri|tue.?sat|7 days/.test(hay);

  const showIngredients =
    isFood || isBeauty || isSupplement || hasMenuPage || /ingredient|allergen|contains:/.test(hay);

  const nameLabel =
    type === "local"
      ? "Business name"
      : type === "agency"
        ? "Brand name"
        : type === "saas"
          ? "Product or service name"
          : "Product name";

  const featuresLabel =
    type === "local"
      ? "Services & highlights (one per line)"
      : type === "agency"
        ? "Core offerings (one per line)"
        : type === "saas"
          ? "Key features (one per line)"
          : "Features (one per line)";

  const priceLabel =
    type === "local"
      ? "Typical price or range"
      : hasPricingPage || type === "saas"
        ? "Starting price"
        : "Price";

  const locationLabel = type === "local" ? "Address or neighborhood" : "Business location";

  const ingredientsLabel = isFood
    ? "Menu items or ingredients (one per line)"
    : isBeauty || isSupplement
      ? "Key ingredients (one per line)"
      : "Ingredients (one per line)";

  const visibleBits = [
    "name",
    "features",
    showPrice ? "price" : null,
    showLocation ? "location" : null,
    showHours ? "hours" : null,
    showIngredients ? "ingredients" : null,
  ].filter(Boolean);

  const summary = `Tailored for ${siteLabel} (${siteTypeLabel(type)}). Showing ${visibleBits.join(", ")}.`;

  return {
    siteType: type,
    siteLabel,
    summary,
    name: {
      show: true,
      label: nameLabel,
      placeholder: site?.brand.name ?? "Your product or business name",
    },
    features: {
      show: true,
      label: featuresLabel,
      placeholder: "One highlight per line",
      hint: "Only list claims you can verify from the crawled site.",
    },
    price: {
      show: showPrice,
      label: priceLabel,
      placeholder: showPrice ? "$49 / month" : undefined,
      hint: showPrice
        ? undefined
        : "Hidden for this site type — pricing is usually custom or not public.",
    },
    location: {
      show: showLocation,
      label: locationLabel,
      placeholder: "City, neighborhood, or address",
      hint: showLocation
        ? undefined
        : "Hidden unless the business has a physical presence.",
    },
    hours: {
      show: showHours,
      label: "Hours of operation",
      placeholder: "Mon–Sat 9am–6pm",
      hint: showHours
        ? undefined
        : "Hidden unless the site signals walk-in or local hours.",
    },
    ingredients: {
      show: showIngredients,
      label: ingredientsLabel,
      hint: showIngredients
        ? undefined
        : "Hidden unless the site sells food, beauty, or supplement products.",
    },
  };
}

export function normalizeProductFactsForSite(
  facts: ProductFactsForm,
  config: ProductFactFieldsConfig,
  options?: { showAllFields?: boolean },
): ProductFactsForm {
  const showAll = options?.showAllFields ?? false;
  const normalized: ProductFactsForm = { ...facts };

  if (!showAll && !config.price.show && !normalized.price.trim()) {
    normalized.price = defaultPriceForHiddenField(config.siteType);
  }

  if (!showAll) {
    if (!config.location.show) normalized.location = undefined;
    if (!config.hours.show) normalized.hours = undefined;
    if (!config.ingredients.show) normalized.ingredients = [];
  }

  return normalized;
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