import { buildPublishContext } from "./publish-post";
import type { Platform, PostPerformance } from "./types";
import { extractExternalId } from "./extract-external-id";

type MetricsContext = Record<string, string>;

function engagementRate(
  engagements: number,
  impressions: number,
): number | undefined {
  if (impressions <= 0) return undefined;
  return Math.round((engagements / impressions) * 1000) / 10;
}

function totalEngagements(m: PostPerformance): number {
  return (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.clicks ?? 0);
}

async function fetchTwitterMetrics(
  tweetId: string,
  token: string,
): Promise<PostPerformance | null> {
  try {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return null;
    const data = await response.json();
    const metrics = data.data?.public_metrics;
    if (!metrics) return null;

    const impressions = metrics.impression_count ?? 0;
    const likes = metrics.like_count ?? 0;
    const comments = metrics.reply_count ?? 0;
    const shares = (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0);
    const engagements = likes + comments + shares;

    return {
      impressions,
      likes,
      comments,
      shares,
      engagementRate: engagementRate(engagements, impressions),
      fetchedAt: new Date().toISOString(),
      source: "api",
    };
  } catch {
    return null;
  }
}

async function fetchFacebookMetrics(
  postId: string,
  token: string,
): Promise<PostPerformance | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${postId}?fields=shares,likes.summary(true),comments.summary(true),insights.metric(post_impressions,post_engaged_users,post_clicks)&access_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) return null;
    const data = await response.json();

    let impressions = 0;
    let clicks = 0;
    let engaged = 0;
    const insights = data.insights?.data as
      | Array<{ name: string; values: Array<{ value: number }> }>
      | undefined;
    if (insights) {
      for (const row of insights) {
        const val = row.values?.[0]?.value ?? 0;
        if (row.name === "post_impressions") impressions = val;
        if (row.name === "post_engaged_users") engaged = val;
        if (row.name === "post_clicks") clicks = val;
      }
    }

    const likes = data.likes?.summary?.total_count ?? 0;
    const comments = data.comments?.summary?.total_count ?? 0;
    const shares = data.shares?.count ?? 0;
    const engagements = engaged || likes + comments + shares + clicks;

    return {
      impressions: impressions || undefined,
      likes,
      comments,
      shares,
      clicks: clicks || undefined,
      engagementRate: impressions
        ? engagementRate(engagements, impressions)
        : undefined,
      fetchedAt: new Date().toISOString(),
      source: "api",
    };
  } catch {
    return null;
  }
}

async function fetchInstagramMetrics(
  mediaId: string,
  token: string,
): Promise<PostPerformance | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    const rows = data.data as Array<{ name: string; values: Array<{ value: number }> }>;
    if (!Array.isArray(rows)) return null;

    const values: Record<string, number> = {};
    for (const row of rows) {
      values[row.name] = row.values?.[0]?.value ?? 0;
    }

    const impressions = values.impressions || values.reach || 0;
    const likes = values.likes ?? 0;
    const comments = values.comments ?? 0;
    const shares = values.shares ?? 0;
    const engagements = likes + comments + shares + (values.saved ?? 0);

    return {
      impressions: impressions || undefined,
      likes,
      comments,
      shares,
      engagementRate: impressions
        ? engagementRate(engagements, impressions)
        : undefined,
      fetchedAt: new Date().toISOString(),
      source: "api",
    };
  } catch {
    return null;
  }
}

async function fetchPinterestMetrics(
  pinId: string,
  token: string,
): Promise<PostPerformance | null> {
  try {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const response = await fetch(
      `https://api.pinterest.com/v5/pins/${pinId}/analytics?start_date=${start}&end_date=${end}&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return null;
    const data = await response.json();
    const summary = data.all?.daily_metrics as
      | Array<{ data_status: string; metrics: Record<string, number> }>
      | undefined;
    if (!summary) return null;

    let impressions = 0;
    let saves = 0;
    let clicks = 0;
    for (const day of summary) {
      const m = day.metrics ?? {};
      impressions += m.IMPRESSION ?? 0;
      saves += m.SAVE ?? 0;
      clicks += (m.PIN_CLICK ?? 0) + (m.OUTBOUND_CLICK ?? 0);
    }

    const engagements = saves + clicks;
    return {
      impressions: impressions || undefined,
      likes: saves,
      clicks,
      engagementRate: impressions
        ? engagementRate(engagements, impressions)
        : undefined,
      fetchedAt: new Date().toISOString(),
      source: "api",
    };
  } catch {
    return null;
  }
}

export async function fetchPostMetrics(
  platform: Platform,
  externalPostId: string,
  ctx: MetricsContext,
): Promise<PostPerformance | null> {
  switch (platform) {
    case "twitter": {
      const token =
        ctx.twitterAccessToken || process.env.TWITTER_ACCESS_TOKEN;
      if (!token) return null;
      return fetchTwitterMetrics(externalPostId, token);
    }
    case "facebook": {
      const token =
        ctx.facebookAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (!token) return null;
      return fetchFacebookMetrics(externalPostId, token);
    }
    case "instagram": {
      const token =
        ctx.instagramAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
      if (!token) return null;
      return fetchInstagramMetrics(externalPostId, token);
    }
    case "pinterest": {
      const token =
        ctx.pinterestAccessToken || process.env.PINTEREST_ACCESS_TOKEN;
      if (!token) return null;
      return fetchPinterestMetrics(externalPostId, token);
    }
    default:
      return null;
  }
}

export async function syncPostMetrics(post: {
  id: string;
  platform: string;
  siteId: string | null;
  publishUrl: string | null;
  externalPostId: string | null;
}): Promise<PostPerformance | null> {
  const platform = post.platform as Platform;
  const externalId =
    post.externalPostId ?? extractExternalId(platform, post.publishUrl);
  if (!externalId) return null;

  const ctx = await buildPublishContext(post);
  const metrics = await fetchPostMetrics(platform, externalId, ctx);
  return metrics;
}

export function isStalePerformance(
  performance?: PostPerformance | null,
  maxAgeHours = 6,
): boolean {
  if (!performance?.fetchedAt) return true;
  const age = Date.now() - new Date(performance.fetchedAt).getTime();
  return age > maxAgeHours * 3600000;
}

export { totalEngagements };