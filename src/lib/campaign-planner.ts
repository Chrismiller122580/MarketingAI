import { chatCompletion } from "./ai-client";
import { formatVoiceGuide } from "./brand-synthesis";
import { analyzePostHistory } from "./content-uniqueness";
import { corpusSites, findPageInSites, flattenCorpusPages } from "./crawled-content";
import type { CorpusPageHit } from "./crawled-content";
import type {
  BatchGenerateRequest,
  ContentType,
  Platform,
  SiteData,
  WinningCopyHints,
} from "./types";

export type CampaignPlanItem = {
  pagePath: string;
  pageDomain?: string;
  platform: Platform;
  angle: string;
  dayOffset: number;
  brief: string;
};

export type CampaignPlan = {
  theme: string;
  items: CampaignPlanItem[];
  source: "ai" | "heuristic";
};

const PLATFORMS: Platform[] = [
  "instagram",
  "twitter",
  "linkedin",
  "facebook",
  "pinterest",
  "email",
];

type CatalogEntry = CorpusPageHit;

function formatWinningForPlanner(hints?: WinningCopyHints | null): string {
  if (!hints?.promptBlock) return "";
  return `What already works (match energy, do not copy):\n${hints.promptBlock}`;
}

function parseDomainPath(raw: string): { domain?: string; path: string } {
  const trimmed = raw.trim();
  if (trimmed.includes("::")) {
    const [domain, path] = trimmed.split("::");
    return { domain, path: path.startsWith("/") ? path : `/${path}` };
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(trimmed)) {
    const slash = trimmed.indexOf("/");
    return {
      domain: trimmed.slice(0, slash),
      path: trimmed.slice(slash),
    };
  }
  return { path: trimmed.startsWith("/") ? trimmed : `/${trimmed}` };
}

export function resolvePlanPage(
  sites: SiteData[],
  item: { pagePath: string; pageDomain?: string },
): CatalogEntry | undefined {
  const parsed = parseDomainPath(item.pagePath);
  const domain = item.pageDomain || parsed.domain;
  return (
    findPageInSites(sites, { path: parsed.path, domain }) ??
    findPageInSites(sites, { path: parsed.path })
  );
}

function parsePlan(
  raw: string,
  sites: SiteData[],
  platforms: Platform[],
  maxPosts: number,
): CampaignPlan | null {
  try {
    const parsed = JSON.parse(raw) as {
      theme?: string;
      items?: Array<{
        pagePath?: string;
        pageDomain?: string;
        platform?: string;
        angle?: string;
        dayOffset?: number;
        brief?: string;
      }>;
    };

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;

    const items: CampaignPlanItem[] = [];
    for (const item of parsed.items) {
      if (items.length >= maxPosts) break;
      const pagePath = item.pagePath ?? "/";
      const resolved = resolvePlanPage(sites, {
        pagePath,
        pageDomain: item.pageDomain,
      });
      if (!resolved) continue;
      const platform = PLATFORMS.includes(item.platform as Platform)
        ? (item.platform as Platform)
        : platforms[items.length % platforms.length];
      if (!platforms.includes(platform)) continue;

      items.push({
        pagePath: resolved.page.path,
        pageDomain: resolved.site.domain,
        platform,
        angle: String(item.angle ?? "brand awareness").slice(0, 80),
        dayOffset: Math.max(0, Math.min(30, Number(item.dayOffset) || items.length)),
        brief: String(item.brief ?? item.angle ?? "").slice(0, 200),
      });
    }

    if (items.length === 0) return null;

    return {
      theme: String(parsed.theme ?? "Campaign").slice(0, 120),
      items,
      source: "ai",
    };
  } catch {
    return null;
  }
}

function catalogForFocus(
  sites: SiteData[],
  focusPagePaths?: string[],
): CatalogEntry[] {
  const catalog = flattenCorpusPages(sites);
  if (!focusPagePaths?.length) return catalog;

  const allowed = new Set(focusPagePaths);
  const focused = catalog.filter((hit) => {
    const path = hit.page.path;
    return (
      allowed.has(path) ||
      allowed.has(`${hit.site.domain}::${path}`) ||
      allowed.has(`${hit.site.domain}${path}`)
    );
  });
  return focused.length > 0 ? focused : catalog;
}

function rankCatalogByFreshness(
  sites: SiteData[],
  pageCounts: Map<string, number>,
  focusPagePaths?: string[],
): CatalogEntry[] {
  return catalogForFocus(sites, focusPagePaths).sort((a, b) => {
    const aCount =
      pageCounts.get(a.page.path) ??
      pageCounts.get(`${a.site.domain}${a.page.path}`) ??
      0;
    const bCount =
      pageCounts.get(b.page.path) ??
      pageCounts.get(`${b.site.domain}${b.page.path}`) ??
      0;
    if (aCount !== bCount) return aCount - bCount;
    if (a.page.path === "/") return -1;
    if (b.page.path === "/") return 1;
    return b.page.headings.length - a.page.headings.length;
  });
}

function buildHeuristicPlan(
  sites: SiteData[],
  primary: SiteData,
  platforms: Platform[],
  maxPosts: number,
  prompt: string,
  pageCounts: Map<string, number>,
  focusPagePaths?: string[],
): CampaignPlan {
  const themes =
    primary.brand.synthesis?.contentThemes ??
    primary.brand.topics ??
    ["product highlights", "brand story", "customer value"];
  const angles = [
    "thought leadership",
    "product spotlight",
    "social proof",
    "how-it-works",
    "behind the scenes",
    "call to action",
  ];

  const pages = rankCatalogByFreshness(sites, pageCounts, focusPagePaths);

  const items: CampaignPlanItem[] = [];
  let day = 0;

  for (let i = 0; i < maxPosts; i++) {
    const hit = pages[i % pages.length];
    const platform = platforms[i % platforms.length];
    const theme = themes[i % themes.length];
    const angle = angles[i % angles.length];

    items.push({
      pagePath: hit.page.path,
      pageDomain: hit.site.domain,
      platform,
      angle,
      dayOffset: day,
      brief: prompt
        ? `${prompt} — ${angle} angle on ${theme}`
        : `${angle}: ${theme} from ${hit.page.title} (${hit.site.domain})`,
    });
    day += i % platforms.length === platforms.length - 1 ? 1 : 0;
    if ((i + 1) % platforms.length === 0) day++;
  }

  return {
    theme: prompt || `${primary.brand.name} content calendar`,
    items,
    source: "heuristic",
  };
}

export async function planCampaign(
  request: BatchGenerateRequest,
): Promise<CampaignPlan> {
  const {
    site,
    settings,
    prompt = "",
    platforms = settings?.defaultPlatforms ?? ["instagram", "linkedin", "twitter"],
    maxPosts = 9,
    existingPosts = [],
    focusPagePaths,
  } = request;

  const sites = corpusSites(site, request.crawledCorpus);
  const winningCopy = request.winningCopy ?? null;
  const history = analyzePostHistory(existingPosts);
  const freshPages = rankCatalogByFreshness(
    sites,
    history.pageCounts,
    focusPagePaths,
  );

  const pageList = freshPages
    .slice(0, 16)
    .map((hit) => {
      const used =
        history.pageCounts.get(hit.page.path) ??
        history.pageCounts.get(`${hit.site.domain}${hit.page.path}`) ??
        0;
      const freshness =
        used === 0 ? " [never posted]" : used >= 2 ? " [overused]" : "";
      return `${hit.site.domain}${hit.page.path}: ${hit.page.title}${freshness} — ${hit.page.description.slice(0, 80) || hit.page.headings[0] || ""}`;
    })
    .join("\n");

  const themes =
    site.brand.synthesis?.contentThemes?.join(", ") ??
    site.brand.topics.join(", ");

  const usedPages =
    history.usedPages.size > 0
      ? `Already posted pages (prefer fresh ones): ${[...history.usedPages].slice(0, 8).join(", ")}`
      : "No prior posts — full library is fresh.";

  const winningBlock = formatWinningForPlanner(winningCopy);
  const multiSite = sites.length > 1;

  const systemPrompt = `You are a content strategist. Plan a social media campaign calendar as JSON only.
Return: { "theme": string, "items": [{ "pagePath": string, "pageDomain": string, "platform": string, "angle": string, "dayOffset": number, "brief": string }] }
Rules:
- Use only pages from the provided list. pagePath is the path starting with /. pageDomain is the site domain.
- Platforms must be from: ${platforms.join(", ")}
- Prioritize pages marked [never posted]; avoid overusing [overused] pages
- Vary angles across posts — each post needs a distinct hook (question, story, myth-buster, stat, contrarian, how-to, etc.)
- Never repeat the same angle twice in one campaign
- Stagger dayOffset from 0 upward
- brief is 1 sentence creative direction with a specific hook idea grounded in that page
- Exactly ${maxPosts} items
${multiSite ? "- Rotate across crawled sites when it keeps the campaign authentic to each brand. Do not mix two brands in one item." : ""}
${winningCopy?.topPlatform ? `- Lean toward ${winningCopy.topPlatform} when it is in the allowed platforms` : ""}
${winningCopy?.topPage ? `- Include ${winningCopy.topPage} at least once if it is in the page list` : ""}`;

  const userMessage = `Brand: ${site.brand.name}
Voice: ${formatVoiceGuide(site.brand)}
Campaign goal: ${prompt || site.brand.businessModel?.conversionGoal || "engagement"}
Content themes: ${themes}
Target platforms: ${platforms.join(", ")}
Crawled sites: ${sites.map((s) => `${s.brand.name} (${s.domain})`).join("; ")}
${usedPages}
${winningBlock}

Pages:
${pageList}`;

  const raw = await chatCompletion(systemPrompt, userMessage, {
    maxTokens: 1200,
    temperature: 0.6,
    jsonMode: true,
  });

  if (raw) {
    const parsed = parsePlan(raw, sites, platforms, maxPosts);
    if (parsed && parsed.items.length >= Math.min(3, maxPosts)) {
      return parsed;
    }
  }

  return buildHeuristicPlan(
    sites,
    site,
    platforms,
    maxPosts,
    prompt,
    history.pageCounts,
    focusPagePaths,
  );
}

export function planItemToPrompt(
  item: CampaignPlanItem,
  campaignPrompt: string,
): string {
  const parts = [item.brief, item.angle, campaignPrompt].filter(Boolean);
  return parts.join(" — ");
}

export function planItemContentType(): ContentType {
  return "Social Post";
}
