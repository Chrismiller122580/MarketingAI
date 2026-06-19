import type { BrandProfile, BusinessModel, SitePage } from "./types";

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

function detectBusinessModel(pages: SitePage[], brandName: string): BusinessModel {
  const corpus = pages
    .map((p) => `${p.title} ${p.description} ${p.excerpt} ${p.headings.join(" ")}`)
    .join(" ")
    .toLowerCase();

  let type: BusinessModel["type"] = "other";
  if (/saas|software|platform|api|cloud|subscription|dashboard|app\b/i.test(corpus)) {
    type = "saas";
  } else if (/shop|cart|buy now|add to cart|ecommerce|store|product catalog/i.test(corpus)) {
    type = "ecommerce";
  } else if (/agency|consulting|consultancy|we help|our clients|case stud/i.test(corpus)) {
    type = "agency";
  } else if (/services|solutions|expertise|professional services/i.test(corpus)) {
    type = "services";
  } else if (/blog|podcast|newsletter|media|publish|articles/i.test(corpus)) {
    type = "media";
  } else if (/visit us|location|hours|near me|local|restaurant|clinic/i.test(corpus)) {
    type = "local";
  } else if (/nonprofit|donate|charity|foundation|mission/i.test(corpus)) {
    type = "nonprofit";
  }

  const market: BusinessModel["market"] =
    /enterprise|b2b|businesses|teams|organizations|decision.?makers/i.test(corpus)
      ? /consumer|individual|personal|shopper|families/i.test(corpus)
        ? "both"
        : "b2b"
      : "b2c";

  const home = pages.find((p) => p.path === "/") ?? pages[0];
  const valueProposition =
    home.description ||
    home.headings.find((h) => h.length > 20) ||
    `${brandName} delivers value to ${market === "b2b" ? "businesses" : "customers"}.`;

  const revenuePatterns: Record<BusinessModel["type"], string> = {
    saas: "Subscription / recurring revenue",
    ecommerce: "Product sales",
    services: "Service fees / project-based",
    agency: "Retainer or project fees",
    media: "Advertising / subscriptions / sponsorship",
    local: "In-person sales / appointments",
    nonprofit: "Donations / grants",
    other: "Direct sales or lead generation",
  };

  const goalPatterns: Record<BusinessModel["type"], string> = {
    saas: "Free trial sign-up or demo request",
    ecommerce: "Product purchase",
    services: "Consultation booking or quote request",
    agency: "Discovery call or proposal request",
    media: "Subscribe or content engagement",
    local: "Visit, call, or appointment booking",
    nonprofit: "Donation or volunteer sign-up",
    other: "Lead capture or contact form",
  };

  const differentiators: string[] = [];
  if (/fast|quick|instant|speed/i.test(corpus)) differentiators.push("Speed");
  if (/affordable|cost.?effective|pricing|free/i.test(corpus)) differentiators.push("Value pricing");
  if (/expert|trusted|award|certified|leader/i.test(corpus)) differentiators.push("Expertise & trust");
  if (/easy|simple|intuitive|seamless/i.test(corpus)) differentiators.push("Ease of use");
  if (/innovative|cutting.?edge|ai|automation/i.test(corpus)) differentiators.push("Innovation");

  const painPoints: string[] = [];
  if (/save time|efficien|automate|streamlin/i.test(corpus)) painPoints.push("Time-consuming workflows");
  if (/cost|budget|expensive|afford/i.test(corpus)) painPoints.push("High costs");
  if (/complex|difficult|overwhelm|confus/i.test(corpus)) painPoints.push("Complexity");
  if (/scale|grow|expand/i.test(corpus)) painPoints.push("Scaling challenges");
  if (/trust|secure|reliable|compliance/i.test(corpus)) painPoints.push("Trust & security concerns");

  return {
    type,
    market,
    valueProposition: valueProposition.slice(0, 200),
    revenueModel: revenuePatterns[type],
    conversionGoal: goalPatterns[type],
    differentiators: differentiators.slice(0, 4),
    painPoints: painPoints.slice(0, 3),
  };
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
    businessModel: detectBusinessModel(pages, brandName),
  };
}