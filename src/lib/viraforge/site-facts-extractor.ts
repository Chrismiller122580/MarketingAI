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

export type SitePageRole =
  | "home"
  | "pricing"
  | "about"
  | "contact"
  | "products"
  | "services"
  | "offerings"
  | "other";

export type OfferingFocus =
  | "retail_products"
  | "menu_items"
  | "software"
  | "professional_services"
  | "protection_plans"
  | "general";

const NOISE_HEADING =
  /^(home|about(\s+us)?|contact(\s+us)?|services?|products?|pricing|blog|news|faq|support|login|sign\s*up|get\s+started|learn\s+more|read\s+more|menu|cart|search|privacy|terms)$/i;

const NAV_LIKE =
  /^(why\s+us|how\s+it\s+works|our\s+story|meet\s+the\s+team|careers|locations?)$/i;

function pageHaystack(page: SitePage): string {
  return `${page.path} ${page.title} ${page.description}`.toLowerCase();
}

function pathMatches(page: SitePage, pattern: RegExp): boolean {
  return pattern.test(page.path.toLowerCase());
}

function siteCorpus(site: SiteData): string {
  return site.pages
    .slice(0, 10)
    .map((p) => `${p.path} ${p.title} ${p.description} ${p.excerpt} ${p.headings.join(" ")}`)
    .concat(site.brand.topics, site.brand.tagline)
    .join(" ")
    .toLowerCase();
}

export function classifySitePage(page: SitePage): SitePageRole {
  const path = page.path.toLowerCase();
  const hay = pageHaystack(page);

  if (pathMatches(page, /\/(pricing|plans|packages|rates)(\/|$)/)) return "pricing";
  if (/\/(pricing|plans)/.test(hay) && /pricing|plans/.test(hay)) return "pricing";

  if (pathMatches(page, /\/(contact|locations?|visit)(\/|$)/)) return "contact";
  if (/contact us|visit us|store hours/.test(hay)) return "contact";

  if (pathMatches(page, /\/(about|team|story|who-we-are)(\/|$)/)) return "about";
  if (/about us|our story|who we are/.test(hay)) return "about";

  if (
    pathMatches(page, /\/(products?|shop|catalog|collections?|store)(\/|$)/) ||
    /\bproducts?\s+page\b/.test(hay) ||
    (page.title.toLowerCase() === "products" || page.title.toLowerCase() === "shop")
  ) {
    return "products";
  }

  if (
    pathMatches(page, /\/(services?|solutions?|what-we-do)(\/|$)/) ||
    (/\bservices?\b/.test(hay) &&
      !/\bproduct/.test(path) &&
      (page.title.toLowerCase().includes("service") ||
        page.title.toLowerCase().includes("solution")))
  ) {
    return "services";
  }

  if (
    pathMatches(
      page,
      /\/(coverage|protection|warranty|contract|plans?|benefits|programs?|vehicle|vsc|extended)(\/|$)/i,
    ) ||
    /service contract|extended coverage|protection plan|vehicle service|roadside|deductible/.test(
      hay,
    )
  ) {
    return "offerings";
  }

  if (page.path === "/" || page.path === "") return "home";
  return "other";
}

export function detectOfferingFocus(site: SiteData): OfferingFocus {
  const type = site.brand.businessModel?.type ?? "other";
  const hay = siteCorpus(site);

  if (
    /extended (vehicle )?service contract|vehicle service contract|\bvsc\b|protection plan|warranty coverage|roadside assistance|deductible|powertrain/.test(
      hay,
    )
  ) {
    return "protection_plans";
  }

  if (/restaurant|menu item|chef|dining|cuisine|bakery|cafe/.test(hay)) {
    return "menu_items";
  }

  if (
    type === "saas" ||
    /saas|api|platform|dashboard|integration|software/.test(hay)
  ) {
    return "software";
  }

  if (
    type === "ecommerce" ||
    /add to cart|shop now|buy now|sku|catalog/.test(hay) ||
    site.pages.some((page) => classifySitePage(page) === "products")
  ) {
    return "retail_products";
  }

  if (
    type === "services" ||
    type === "agency" ||
    type === "local" ||
    /consulting|professional services|our services/.test(hay) ||
    site.pages.some((page) => classifySitePage(page) === "services")
  ) {
    return "professional_services";
  }

  return "general";
}

function scorePageForFacts(page: SitePage, focus: OfferingFocus): number {
  const role = classifySitePage(page);
  let score = 0;

  if (role === "contact" || role === "about") return -100;
  if (/\/(blog|news|careers|legal|privacy|terms|login|signup)/.test(page.path)) {
    return -80;
  }

  const path = page.path.toLowerCase();
  const hay = pageHaystack(page);

  const focusBoosts: Record<OfferingFocus, Array<[RegExp, number]>> = {
    retail_products: [
      [/\/products?(\/|$)/, 40],
      [/\/shop(\/|$)/, 35],
      [/\/catalog(\/|$)/, 30],
      [/\bproducts?\b/, 8],
    ],
    menu_items: [
      [/\/menu(\/|$)/, 40],
      [/\/food(\/|$)/, 25],
    ],
    software: [
      [/\/features?(\/|$)/, 30],
      [/\/platform(\/|$)/, 28],
      [/\/pricing(\/|$)/, 20],
      [/\/product(\/|$)/, 10],
    ],
    professional_services: [
      [/\/services?(\/|$)/, 40],
      [/\/solutions?(\/|$)/, 35],
      [/\bservices?\b/, 10],
    ],
    protection_plans: [
      [/\/coverage(\/|$)/, 40],
      [/\/protection(\/|$)/, 38],
      [/\/warranty(\/|$)/, 36],
      [/\/plans?(\/|$)/, 34],
      [/\/vehicle(\/|$)|\/vsc(\/|$)|\/contract(\/|$)/, 32],
      [/service[- ]contract|extended coverage|protection plan/, 20],
      [/\/products?(\/|$)/, -25],
      [/\bproducts?\b/, -8],
    ],
    general: [
      [/\/products?(\/|$)/, 15],
      [/\/services?(\/|$)/, 15],
      [/\/pricing(\/|$)/, 12],
    ],
  };

  for (const [pattern, points] of focusBoosts[focus]) {
    if (pattern.test(path) || pattern.test(hay)) score += points;
  }

  if (role === "offerings") score += 30;
  if (role === "products" && focus === "retail_products") score += 25;
  if (role === "products" && focus === "protection_plans") score -= 20;
  if (role === "services" && focus === "professional_services") score += 25;
  if (role === "services" && focus === "protection_plans") score += 10;
  if (role === "pricing") score += 18;
  if (role === "home") score += 6;

  const excerptLen = page.excerpt.trim().length;
  if (excerptLen > 120) score += 8;
  if (page.headings.length >= 3) score += 5;

  return score;
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

  const focus = detectOfferingFocus(site);
  const ranked = [...site.pages]
    .map((page) => ({ page, score: scorePageForFacts(page, focus) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked[0]) return ranked[0].page;

  const byRole = (role: SitePageRole) =>
    site.pages.find((p) => classifySitePage(p) === role);

  const fallbackOrder: SitePageRole[] =
    focus === "retail_products"
      ? ["products", "pricing", "offerings", "home"]
      : focus === "protection_plans"
        ? ["offerings", "services", "pricing", "home"]
        : focus === "professional_services"
          ? ["services", "offerings", "pricing", "home"]
          : focus === "software"
            ? ["pricing", "offerings", "products", "home"]
            : ["offerings", "products", "services", "pricing", "home"];

  for (const role of fallbackOrder) {
    const match = byRole(role);
    if (match) return match;
  }

  return site.pages.find((p) => p.path === "/") ?? site.pages[0];
}

function cleanPageTitle(title: string, brandName: string): string {
  const trimmed = title
    .replace(/\s*[|\-–—]\s*.+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) return brandName;
  if (trimmed.toLowerCase() === brandName.toLowerCase()) return brandName;
  if (trimmed.length > 90) return brandName;
  return trimmed;
}

function isNoiseFeature(text: string, focus: OfferingFocus): boolean {
  const normalized = text.trim();
  if (normalized.length < 12 || normalized.length > 140) return true;
  if (NOISE_HEADING.test(normalized) || NAV_LIKE.test(normalized)) return true;
  if (/^https?:\/\//i.test(normalized)) return true;
  if (/^\d{4}\b/.test(normalized)) return true;
  if (/copyright|all rights reserved|follow us/i.test(normalized)) return true;

  const lower = normalized.toLowerCase();
  if (focus === "protection_plans" && /\bproducts?\b/.test(lower) && lower.length < 40) {
    return true;
  }
  if (
    focus !== "retail_products" &&
    /\b(products? page|shop now|add to cart|buy now)\b/.test(lower)
  ) {
    return true;
  }

  return false;
}

function scoreFeatureCandidate(text: string, focus: OfferingFocus): number {
  const lower = text.toLowerCase();
  let score = 10;

  if (/[•✓]|(?:\d+\s*(?:month|year|mile))/i.test(text)) score += 8;
  if (/\$|%|included|coverage|repair|roadside|deductible|warranty|plan/i.test(lower)) {
    score += focus === "protection_plans" ? 14 : 6;
  }
  if (/feature|benefit|includes|protect|service/i.test(lower)) score += 5;
  if (lower.split(/\s+/).length >= 4) score += 4;
  if (NOISE_HEADING.test(text) || NAV_LIKE.test(text)) score -= 30;

  return score;
}

function extractFeaturesFromPage(page: SitePage, focus: OfferingFocus): string[] {
  const candidates: Array<{ text: string; score: number }> = [];

  for (const heading of page.headings) {
    const text = heading.trim();
    if (isNoiseFeature(text, focus)) continue;
    candidates.push({ text, score: scoreFeatureCandidate(text, focus) + 6 });
  }

  for (const chunk of page.excerpt.split(/[•\-\n|]/)) {
    const text = chunk.trim();
    if (isNoiseFeature(text, focus)) continue;
    candidates.push({ text, score: scoreFeatureCandidate(text, focus) });
  }

  const ranked = candidates
    .filter((item) => item.score > 8)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.text);

  return uniqueStrings(ranked, 8);
}

function extractOfferingName(
  page: SitePage,
  site: SiteData,
  focus: OfferingFocus,
): string {
  const brand = site.brand.name.trim();
  const role = classifySitePage(page);

  if (
    focus === "protection_plans" ||
    focus === "professional_services" ||
    role === "home"
  ) {
    const offeringHeading = page.headings.find((heading) => {
      const text = heading.trim();
      if (text.length < 8 || text.length > 80) return false;
      if (NOISE_HEADING.test(text) || NAV_LIKE.test(text)) return false;
      if (/service contract|protection plan|extended coverage|vehicle service/i.test(text)) {
        return true;
      }
      return focus === "professional_services" && /service|solution|program/i.test(text);
    });

    if (offeringHeading) return offeringHeading.trim();
    if (role !== "home") return cleanPageTitle(page.title, brand);
    return brand;
  }

  if (focus === "retail_products" && role === "products") {
    return cleanPageTitle(page.title, brand);
  }

  const primaryHeading = page.headings.find((heading) => {
    const text = heading.trim();
    return (
      text.length >= 4 &&
      text.length <= 80 &&
      !NOISE_HEADING.test(text) &&
      !NAV_LIKE.test(text)
    );
  });

  if (primaryHeading) return primaryHeading.trim();
  return cleanPageTitle(page.title, brand) || brand;
}

export function extractCrawledProductFacts(
  site: SiteData,
  page?: SitePage,
): Partial<ProductFactsForm> & { sourcePath?: string; offeringFocus?: OfferingFocus } {
  const focus = detectOfferingFocus(site);
  const target = page ?? pickBestPageForFacts(site);
  if (!target) return { offeringFocus: focus };

  const role = classifySitePage(target);
  const pageCorpus = `${target.title} ${target.description} ${target.excerpt} ${target.headings.join(" ")}`;
  const siteCorpusText = site.pages
    .slice(0, 8)
    .map((p) => `${p.title} ${p.description} ${p.excerpt} ${p.headings.join(" ")}`)
    .join("\n");

  const prices = extractPrices(
    role === "pricing" || role === "offerings" || role === "products"
      ? pageCorpus
      : siteCorpusText,
  );
  const features = extractFeaturesFromPage(target, focus);
  const fallbackFeatures = uniqueStrings(
    [
      ...(site.brand.businessModel?.differentiators ?? []),
      ...(site.brand.synthesis?.messagingPillars ?? []),
      site.brand.tagline,
    ].filter((item): item is string => Boolean(item?.trim())),
    4,
  );

  const locationCorpus =
    site.pages.find((p) => classifySitePage(p) === "contact")?.excerpt ??
    siteCorpusText;
  const locationMatch = locationCorpus.match(
    /(?:located in|based in|serving|visit us at)\s+([A-Z][^.!\n]{4,60})/i,
  );
  const hoursMatch = locationCorpus.match(
    /(?:hours?|open)\s*[:\-]?\s*([^\n.]{6,60})/i,
  );

  return {
    name: extractOfferingName(target, site, focus),
    price: prices[0] ?? "",
    features:
      features.length > 0
        ? features
        : fallbackFeatures.length > 0
          ? fallbackFeatures
          : [site.brand.tagline || site.brand.name],
    location: locationMatch?.[1]?.trim(),
    hours: hoursMatch?.[1]?.trim(),
    sourcePath: target.path,
    offeringFocus: focus,
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

  const focus = detectOfferingFocus(site);
  const factsPage = pickBestPageForFacts(site);

  const nameLabel =
    focus === "protection_plans"
      ? "Plan or coverage name"
      : focus === "professional_services" || type === "local"
        ? "Business or service name"
        : type === "agency"
          ? "Brand name"
          : focus === "retail_products"
            ? "Product name"
            : type === "saas"
              ? "Product or service name"
              : "Offering name";

  const featuresLabel =
    focus === "protection_plans"
      ? "Coverage & benefits (one per line)"
      : focus === "professional_services" || type === "local"
        ? "Services & highlights (one per line)"
        : type === "agency"
          ? "Core offerings (one per line)"
          : focus === "retail_products"
            ? "Product features (one per line)"
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

  const sourceHint = crawled.sourcePath
    ? ` Pulled from ${crawled.sourcePath}.`
    : factsPage?.path
      ? ` Pulled from ${factsPage.path}.`
      : "";

  const summary = `Tailored for ${siteLabel} (${siteTypeLabel(type)}). Showing ${visibleBits.join(", ")}.${sourceHint}`;

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