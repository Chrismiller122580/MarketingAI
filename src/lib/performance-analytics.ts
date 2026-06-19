import type {
  PerformanceSummary,
  Platform,
  PostPerformance,
  SavedPost,
} from "./types";
import { totalEngagements } from "./social-metrics";

function platformEngagements(
  stats: PerformanceSummary["platformStats"][Platform] | undefined,
): number {
  if (!stats) return 0;
  return stats.engagements;
}

export function analyzePerformance(posts: SavedPost[]): PerformanceSummary {
  const published = posts.filter((p) => p.publishStatus === "published");
  const withMetrics = published.filter((p) => p.performance?.source === "api");

  let totalImpressions = 0;
  let engagementTotal = 0;
  let rateSum = 0;
  let rateCount = 0;

  const platformStats: PerformanceSummary["platformStats"] = {};
  let topPost: SavedPost | undefined;
  let topEngagements = -1;

  for (const post of withMetrics) {
    const perf = post.performance!;
    const engagements = totalEngagements(perf);
    totalImpressions += perf.impressions ?? 0;
    engagementTotal += engagements;

    if (perf.engagementRate != null) {
      rateSum += perf.engagementRate;
      rateCount++;
    }

    const plat = post.platform;
    const existing = platformStats[plat] ?? {
      posts: 0,
      impressions: 0,
      engagements: 0,
      avgEngagementRate: 0,
    };
    existing.posts += 1;
    existing.impressions += perf.impressions ?? 0;
    existing.engagements += engagements;
    if (perf.engagementRate != null) {
      existing.avgEngagementRate =
        (existing.avgEngagementRate * (existing.posts - 1) + perf.engagementRate) /
        existing.posts;
    }
    platformStats[plat] = existing;

    if (engagements > topEngagements) {
      topEngagements = engagements;
      topPost = post;
    }
  }

  const topPlatform = Object.entries(platformStats).sort(
    (a, b) => platformEngagements(b[1] as PerformanceSummary["platformStats"][Platform]) -
      platformEngagements(a[1] as PerformanceSummary["platformStats"][Platform]),
  )[0]?.[0] as Platform | undefined;

  const recommendations = buildRecommendations(
    published,
    withMetrics,
    platformStats,
    topPost,
    topPlatform,
  );

  const lastSynced = withMetrics
    .map((p) => p.performance?.fetchedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return {
    totalPublished: published.length,
    withMetrics: withMetrics.length,
    totalImpressions,
    totalEngagements: engagementTotal,
    avgEngagementRate: rateCount ? Math.round((rateSum / rateCount) * 10) / 10 : 0,
    topPlatform,
    topPostId: topPost?.id,
    platformStats,
    recommendations,
    lastSyncedAt: lastSynced,
  };
}

function buildRecommendations(
  published: SavedPost[],
  withMetrics: SavedPost[],
  platformStats: PerformanceSummary["platformStats"],
  topPost?: SavedPost,
  topPlatform?: Platform,
): string[] {
  const recs: string[] = [];

  if (published.length === 0) {
    recs.push("Publish posts to start tracking performance across platforms.");
    return recs;
  }

  if (withMetrics.length === 0) {
    recs.push(
      "Connect social accounts and publish via API to unlock impressions and engagement metrics.",
    );
    recs.push(
      `${published.length} published post${published.length === 1 ? "" : "s"} — refresh metrics after API publishing.`,
    );
    return recs;
  }

  if (topPlatform) {
    const stats = platformStats[topPlatform];
    recs.push(
      `Double down on ${topPlatform} — your strongest channel (${stats?.engagements ?? 0} total engagements).`,
    );
  }

  if (topPost) {
    const snippet = topPost.text.slice(0, 60).replace(/\n/g, " ");
    recs.push(
      `Top performer: "${snippet}…" — create more ${topPost.platform} posts from ${topPost.sourcePage ?? "similar pages"}.`,
    );
  }

  const lowPlatforms = Object.entries(platformStats)
    .filter(([, s]) => s && s.posts >= 2 && s.avgEngagementRate < 1)
    .map(([p]) => p as Platform);
  if (lowPlatforms.length > 0) {
    recs.push(
      `Low engagement on ${lowPlatforms.join(", ")} — try shorter hooks or different visuals.`,
    );
  }

  const pages = new Map<string, number>();
  for (const post of withMetrics) {
    if (!post.sourcePage) continue;
    pages.set(
      post.sourcePage,
      (pages.get(post.sourcePage) ?? 0) + totalEngagements(post.performance!),
    );
  }
  const topPage = [...pages.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topPage) {
    recs.push(
      `Page ${topPage[0]} drives the most engagement — repurpose it on other platforms.`,
    );
  }

  if (withMetrics.length < published.length) {
    recs.push(
      `Sync metrics for ${published.length - withMetrics.length} posts published via share links.`,
    );
  }

  return recs.slice(0, 5);
}

export function mergePerformance(
  existing: PostPerformance | undefined,
  incoming: PostPerformance | null,
): PostPerformance | undefined {
  if (!incoming) return existing;
  return incoming;
}