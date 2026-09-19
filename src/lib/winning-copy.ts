import { prisma } from "./db";
import { postToSaved } from "./db-mappers";
import { totalEngagements } from "./social-metrics";
import type { Platform, SavedPost, WinningCopyHints } from "./types";

function firstHook(text: string, max = 140): string {
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? text;
  const cleaned = line.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

function angleFromInsights(insights?: string[]): string | undefined {
  const line = insights?.find((i) => /^creative angle:/i.test(i));
  if (!line) return undefined;
  return line.replace(/^creative angle:\s*/i, "").replace(/\.$/, "").trim() || undefined;
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function formatWinningCopyHints(hints: Omit<WinningCopyHints, "promptBlock">): string {
  const lines: string[] = [];
  if (hints.hasMetrics) {
    lines.push(
      "Learn from this brand's top-performing posts. Match hook energy, length, and page focus — do not copy phrasing.",
    );
  } else {
    lines.push(
      "No API metrics yet. Match the length and hook style of recent published posts — do not copy phrasing.",
    );
  }
  if (hints.topPlatform) {
    lines.push(`Winning channel: ${hints.topPlatform}.`);
  }
  if (hints.topPage) {
    lines.push(`Winning source page: ${hints.topPage} — prefer this page when the brief fits.`);
  }
  if (hints.preferredLength) {
    lines.push(
      `Target about ${hints.preferredLength} characters (winning posts cluster here).`,
    );
  }
  if (hints.winningAngles.length > 0) {
    lines.push(`Angles that landed: ${hints.winningAngles.join(", ")}.`);
  }
  if (hints.examples.length > 0) {
    lines.push("Few-shot winners (rewrite, don't clone):");
    hints.examples.forEach((ex, i) => {
      const meta = [
        ex.platform,
        ex.page,
        ex.angle,
        `${ex.length} chars`,
        ex.engagements > 0 ? `${ex.engagements} eng` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(`${i + 1}. "${ex.hook}" (${meta})`);
    });
  }
  return lines.join(" ");
}

export function buildWinningCopyHints(
  posts: SavedPost[],
): WinningCopyHints | null {
  const published = posts.filter((p) => p.publishStatus === "published");
  const withMetrics = published.filter((p) => p.performance?.source === "api");
  const pool = withMetrics.length > 0 ? withMetrics : published;
  if (pool.length === 0) return null;

  const ranked = [...pool]
    .map((post) => ({
      post,
      engagements:
        post.performance?.source === "api"
          ? totalEngagements(post.performance)
          : 0,
    }))
    .sort((a, b) => {
      if (b.engagements !== a.engagements) return b.engagements - a.engagements;
      const aRate = a.post.performance?.engagementRate ?? 0;
      const bRate = b.post.performance?.engagementRate ?? 0;
      if (bRate !== aRate) return bRate - aRate;
      return (
        new Date(b.post.publishedAt ?? b.post.createdAt).getTime() -
        new Date(a.post.publishedAt ?? a.post.createdAt).getTime()
      );
    });

  const top = ranked.slice(0, 3);
  const hasMetrics = withMetrics.length > 0;

  const platformScores = new Map<Platform, number>();
  const pageScores = new Map<string, number>();
  const angles: string[] = [];
  const lengths: number[] = [];

  for (const { post, engagements } of ranked.slice(0, 12)) {
    const weight = hasMetrics ? Math.max(1, engagements) : 1;
    platformScores.set(
      post.platform,
      (platformScores.get(post.platform) ?? 0) + weight,
    );
    if (post.sourcePage) {
      pageScores.set(
        post.sourcePage,
        (pageScores.get(post.sourcePage) ?? 0) + weight,
      );
    }
    const angle = angleFromInsights(post.insights);
    if (angle && !angles.includes(angle)) angles.push(angle);
    lengths.push(post.characterCount || post.text.length);
  }

  const topPlatform = [...platformScores.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const topPage = [...pageScores.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const preferredLength = median(lengths);

  const examples = top.map(({ post, engagements }) => ({
    hook: firstHook(post.text),
    platform: post.platform,
    page: post.sourcePage,
    angle: angleFromInsights(post.insights),
    length: post.characterCount || post.text.length,
    engagements,
  }));

  const base = {
    topPlatform,
    topPage,
    preferredLength,
    winningAngles: angles.slice(0, 4),
    examples,
    hasMetrics,
  };

  return {
    ...base,
    promptBlock: formatWinningCopyHints(base),
  };
}

export async function loadWinningCopyHints(
  userId: string,
): Promise<WinningCopyHints | null> {
  const rows = await prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return buildWinningCopyHints(rows.map(postToSaved));
}

export function preferWinningPlatform(
  platforms: Platform[],
  topPlatform?: Platform,
): Platform[] {
  if (!topPlatform || !platforms.includes(topPlatform)) return platforms;
  return [topPlatform, ...platforms.filter((p) => p !== topPlatform)];
}
