import { chatCompletion } from "./ai-client";
import { formatVoiceGuide } from "./brand-synthesis";
import { analyzePostHistory } from "./content-uniqueness";
import type {
  BatchGenerateRequest,
  ContentType,
  Platform,
  SiteData,
  SitePage,
  UserSettings,
} from "./types";

export type CampaignPlanItem = {
  pagePath: string;
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

function resolvePage(site: SiteData, path: string): SitePage | undefined {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return (
    site.pages.find((p) => p.path === normalized) ??
    site.pages.find((p) => p.path === path)
  );
}

function parsePlan(
  raw: string,
  site: SiteData,
  platforms: Platform[],
  maxPosts: number,
): CampaignPlan | null {
  try {
    const parsed = JSON.parse(raw) as {
      theme?: string;
      items?: Array<{
        pagePath?: string;
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
      if (!resolvePage(site, pagePath)) continue;
      const platform = PLATFORMS.includes(item.platform as Platform)
        ? (item.platform as Platform)
        : platforms[items.length % platforms.length];
      if (!platforms.includes(platform)) continue;

      items.push({
        pagePath: pagePath.startsWith("/") ? pagePath : `/${pagePath}`,
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

function rankPagesByFreshness(
  site: SiteData,
  pageCounts: Map<string, number>,
): SitePage[] {
  return [...site.pages].sort((a, b) => {
    const aCount = pageCounts.get(a.path) ?? 0;
    const bCount = pageCounts.get(b.path) ?? 0;
    if (aCount !== bCount) return aCount - bCount;
    if (a.path === "/") return -1;
    if (b.path === "/") return 1;
    return b.headings.length - a.headings.length;
  });
}

function buildHeuristicPlan(
  site: SiteData,
  platforms: Platform[],
  maxPosts: number,
  prompt: string,
  pageCounts: Map<string, number>,
): CampaignPlan {
  const themes =
    site.brand.synthesis?.contentThemes ??
    site.brand.topics ??
    ["product highlights", "brand story", "customer value"];
  const angles = [
    "thought leadership",
    "product spotlight",
    "social proof",
    "how-it-works",
    "behind the scenes",
    "call to action",
  ];

  const pages = rankPagesByFreshness(site, pageCounts);

  const items: CampaignPlanItem[] = [];
  let day = 0;

  for (let i = 0; i < maxPosts; i++) {
    const page = pages[i % pages.length];
    const platform = platforms[i % platforms.length];
    const theme = themes[i % themes.length];
    const angle = angles[i % angles.length];

    items.push({
      pagePath: page.path,
      platform,
      angle,
      dayOffset: day,
      brief: prompt
        ? `${prompt} — ${angle} angle on ${theme}`
        : `${angle}: ${theme} from ${page.title}`,
    });
    day += i % platforms.length === platforms.length - 1 ? 1 : 0;
    if ((i + 1) % platforms.length === 0) day++;
  }

  return {
    theme: prompt || `${site.brand.name} content calendar`,
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
  } = request;

  const history = analyzePostHistory(existingPosts);
  const freshPages = rankPagesByFreshness(site, history.pageCounts);

  const pageList = freshPages
    .slice(0, 12)
    .map((p) => {
      const used = history.pageCounts.get(p.path) ?? 0;
      const freshness = used === 0 ? " [never posted]" : used >= 2 ? " [overused]" : "";
      return `${p.path}: ${p.title}${freshness} — ${p.description.slice(0, 80) || p.headings[0] || ""}`;
    })
    .join("\n");

  const themes =
    site.brand.synthesis?.contentThemes?.join(", ") ??
    site.brand.topics.join(", ");

  const usedPages =
    history.usedPages.size > 0
      ? `Already posted pages (prefer fresh ones): ${[...history.usedPages].slice(0, 8).join(", ")}`
      : "No prior posts — full library is fresh.";

  const systemPrompt = `You are a content strategist. Plan a social media campaign calendar as JSON only.
Return: { "theme": string, "items": [{ "pagePath": string, "platform": string, "angle": string, "dayOffset": number, "brief": string }] }
Rules:
- Use only page paths from the provided list
- Platforms must be from: ${platforms.join(", ")}
- Prioritize pages marked [never posted]; avoid overusing [overused] pages
- Vary angles across posts — each post needs a distinct hook (question, story, myth-buster, stat, contrarian, how-to, etc.)
- Never repeat the same angle twice in one campaign
- Stagger dayOffset from 0 upward
- brief is 1 sentence creative direction with a specific hook idea
- Exactly ${maxPosts} items`;

  const userMessage = `Brand: ${site.brand.name}
Voice: ${formatVoiceGuide(site.brand)}
Campaign goal: ${prompt || site.brand.businessModel?.conversionGoal || "engagement"}
Content themes: ${themes}
Target platforms: ${platforms.join(", ")}
${usedPages}

Pages:
${pageList}`;

  const raw = await chatCompletion(systemPrompt, userMessage, {
    maxTokens: 1200,
    temperature: 0.6,
    jsonMode: true,
  });

  if (raw) {
    const parsed = parsePlan(raw, site, platforms, maxPosts);
    if (parsed && parsed.items.length >= Math.min(3, maxPosts)) {
      return parsed;
    }
  }

  return buildHeuristicPlan(site, platforms, maxPosts, prompt, history.pageCounts);
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