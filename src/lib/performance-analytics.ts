import type {
  InfluencerPerformanceStat,
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

  const influencerStats = buildInfluencerStats(published, withMetrics);

  const recommendations = buildRecommendations(
    published,
    withMetrics,
    platformStats,
    topPost,
    topPlatform,
    influencerStats,
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
    influencerStats,
  };
}

function buildInfluencerStats(
  published: SavedPost[],
  withMetrics: SavedPost[],
): InfluencerPerformanceStat[] {
  const byId = new Map<string, InfluencerPerformanceStat>();

  for (const post of published) {
    if (!post.influencerId) continue;
    const existing = byId.get(post.influencerId) ?? {
      influencerId: post.influencerId,
      posts: 0,
      withMetrics: 0,
      engagements: 0,
      avgEngagementRate: 0,
      motionPosts: 0,
    };
    existing.posts += 1;
    if (post.image.source === "influencer" && post.image.videoUrl) {
      existing.motionPosts += 1;
    }
    byId.set(post.influencerId, existing);
  }

  for (const post of withMetrics) {
    if (!post.influencerId) continue;
    const existing = byId.get(post.influencerId);
    if (!existing) continue;
    const perf = post.performance!;
    existing.withMetrics += 1;
    existing.engagements += totalEngagements(perf);
    if (perf.engagementRate != null) {
      existing.avgEngagementRate =
        (existing.avgEngagementRate * (existing.withMetrics - 1) +
          perf.engagementRate) /
        existing.withMetrics;
    }
  }

  return [...byId.values()]
    .filter((s) => s.posts > 0)
    .sort((a, b) => b.engagements - a.engagements);
}

function buildRecommendations(
  published: SavedPost[],
  withMetrics: SavedPost[],
  platformStats: PerformanceSummary["platformStats"],
  topPost?: SavedPost,
  topPlatform?: Platform,
  influencerStats: InfluencerPerformanceStat[] = [],
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

  const topInfluencer = influencerStats.find((s) => s.withMetrics > 0);
  if (topInfluencer && topInfluencer.engagements > 0) {
    const label = topInfluencer.handle
      ? `@${topInfluencer.handle}`
      : "your linked avatar";
    recs.push(
      `${label} drove ${topInfluencer.engagements} engagements across ${topInfluencer.withMetrics} tracked post${topInfluencer.withMetrics === 1 ? "" : "s"} — create more with motion clips.`,
    );
    if (topInfluencer.motionPosts > 0) {
      recs.push(
        `Motion clips used on ${topInfluencer.motionPosts} avatar post${topInfluencer.motionPosts === 1 ? "" : "s"} — try Talk after your next site draft.`,
      );
    }
  }

  const avatarPosts = published.filter((p) => p.influencerId).length;
  const nonAvatar = published.length - avatarPosts;
  if (avatarPosts > 0 && nonAvatar > avatarPosts && withMetrics.length > 2) {
    recs.push(
      `${avatarPosts} posts used a linked influencer — compare avatar vs standard posts in analytics.`,
    );
  }

  return recs.slice(0, 6);
}

export function mergePerformance(
  existing: PostPerformance | undefined,
  incoming: PostPerformance | null,
): PostPerformance | undefined {
  if (!incoming) return existing;
  return incoming;
}