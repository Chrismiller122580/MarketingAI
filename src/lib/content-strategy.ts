import { chatCompletion } from "./ai-client";
import { analyzePerformance } from "./performance-analytics";
import type {
  ContentGapAnalysis,
  Platform,
  SavedPost,
  SiteData,
  UserSettings,
} from "./types";

export function analyzeContentGaps(
  site: SiteData,
  posts: SavedPost[],
  settings: UserSettings,
): ContentGapAnalysis {
  const pageUsage = new Map<string, number>();
  const platformBreakdown: Partial<Record<Platform, number>> = {};

  for (const post of posts) {
    if (post.sourcePage) {
      pageUsage.set(post.sourcePage, (pageUsage.get(post.sourcePage) ?? 0) + 1);
    }
    platformBreakdown[post.platform] =
      (platformBreakdown[post.platform] ?? 0) + 1;
  }

  const underusedPages = site.pages
    .filter((p) => (pageUsage.get(p.path) ?? 0) === 0)
    .slice(0, 8)
    .map((p) => ({ path: p.path, title: p.title }));

  const missingPlatforms = settings.defaultPlatforms.filter(
    (p) => !(platformBreakdown[p] ?? 0),
  );

  const coveredThemes = new Set<string>();
  for (const post of posts) {
    const words = post.text.toLowerCase().split(/\s+/);
    for (const theme of site.brand.synthesis?.contentThemes ?? []) {
      if (words.some((w) => theme.toLowerCase().includes(w) || w.length > 4 && theme.toLowerCase().includes(w))) {
        coveredThemes.add(theme);
      }
    }
  }

  const uncoveredThemes = (site.brand.synthesis?.contentThemes ?? site.brand.topics)
    .filter((t) => !coveredThemes.has(t))
    .slice(0, 6);

  const recommendations: string[] = [];

  if (underusedPages.length > 0) {
    recommendations.push(
      `Promote "${underusedPages[0].title}" (${underusedPages[0].path}) — never used in your library yet.`,
    );
  }
  if (underusedPages.length >= 3) {
    recommendations.push(
      `${underusedPages.length} crawled pages have zero posts — run a campaign pack to cover them.`,
    );
  }
  for (const platform of missingPlatforms) {
    recommendations.push(
      `No ${platform} content yet — add posts for your configured platform.`,
    );
  }
  if (uncoveredThemes.length > 0) {
    recommendations.push(
      `Try a post about "${uncoveredThemes[0]}" — a brand theme you haven't covered.`,
    );
  }
  if (posts.length === 0) {
    recommendations.push(
      "Generate your first campaign pack to build a week of content from your site.",
    );
  }
  if (posts.filter((p) => p.publishStatus === "published").length === 0 && posts.length > 3) {
    recommendations.push(
      "You have drafts ready — schedule or publish your top posts this week.",
    );
  }

  const sortedPlatforms = Object.entries(platformBreakdown).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
  );
  if (sortedPlatforms[0] && (sortedPlatforms[0][1] ?? 0) >= 3) {
    recommendations.push(
      `Double down on ${sortedPlatforms[0][0]} — your most-used platform.`,
    );
  }

  const performance = analyzePerformance(posts);
  for (const perfRec of performance.recommendations.slice(0, 2)) {
    if (!recommendations.includes(perfRec)) {
      recommendations.push(perfRec);
    }
  }

  return {
    underusedPages,
    missingPlatforms,
    uncoveredThemes,
    recommendations: recommendations.slice(0, 8),
    platformBreakdown: platformBreakdown as Record<Platform, number>,
    totalPosts: posts.length,
    publishedPosts: posts.filter((p) => p.publishStatus === "published").length,
    pageCount: site.pages.length,
    performance,
  };
}

export async function enrichStrategyRecommendations(
  site: SiteData,
  analysis: ContentGapAnalysis,
): Promise<string[]> {
  const base = analysis.recommendations;
  const context = `Underused pages: ${analysis.underusedPages.map((p) => p.path).join(", ") || "none"}
Missing platforms: ${analysis.missingPlatforms.join(", ") || "none"}
Uncovered themes: ${analysis.uncoveredThemes.join(", ") || "none"}
Posts: ${analysis.totalPosts} total, ${analysis.publishedPosts} published`;

  const raw = await chatCompletion(
    "You are a marketing strategist. Given content gap data, return JSON: { \"recommendations\": string[] } with 3 actionable next-step suggestions (one sentence each).",
    `Brand: ${site.brand.name}\n${context}`,
    { maxTokens: 400, temperature: 0.5, jsonMode: true },
  );

  if (!raw) return base;

  try {
    const parsed = JSON.parse(raw) as { recommendations?: string[] };
    if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
      return [...new Set([...parsed.recommendations.slice(0, 3), ...base])].slice(0, 6);
    }
  } catch {
    /* keep base */
  }

  return base;
}