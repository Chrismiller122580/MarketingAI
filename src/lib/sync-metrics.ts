import { prisma } from "./db";
import { postToSaved } from "./db-mappers";
import { analyzePerformance } from "./performance-analytics";
import { extractExternalId } from "./extract-external-id";
import { isStalePerformance, syncPostMetrics } from "./social-metrics";
import type { Platform, PerformanceSummary, PostPerformance } from "./types";

export async function syncUserPostMetrics(
  userId: string,
  options?: { force?: boolean; limit?: number },
): Promise<{ synced: number; failed: number; summary: PerformanceSummary }> {
  const limit = options?.limit ?? 30;

  const posts = await prisma.post.findMany({
    where: { userId, publishStatus: "published" },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  let synced = 0;
  let failed = 0;

  for (const post of posts) {
    const existing = post.performance as PostPerformance | null;
    if (!options?.force && !isStalePerformance(existing)) continue;
    if (!post.externalPostId && !post.publishUrl) continue;

    const externalPostId =
      post.externalPostId ??
      extractExternalId(post.platform as Platform, post.publishUrl);

    const metrics = await syncPostMetrics({
      ...post,
      externalPostId,
    });
    if (metrics) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          performance: metrics,
          ...(externalPostId && { externalPostId }),
        },
      });
      synced++;
    } else {
      failed++;
    }
  }

  const refreshed = await prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const summary = analyzePerformance(refreshed.map(postToSaved));
  return { synced, failed, summary };
}

export async function syncAllStaleMetrics(limit = 50): Promise<{
  users: number;
  synced: number;
}> {
  const posts = await prisma.post.findMany({
    where: { publishStatus: "published", externalPostId: { not: null } },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  let synced = 0;
  const users = new Set<string>();

  for (const post of posts) {
    const existing = post.performance as PostPerformance | null;
    if (!isStalePerformance(existing)) continue;

    users.add(post.userId);
    const metrics = await syncPostMetrics(post);
    if (metrics) {
      await prisma.post.update({
        where: { id: post.id },
        data: { performance: metrics },
      });
      synced++;
    }
  }

  return { users: users.size, synced };
}