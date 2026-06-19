import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { postToSaved } from "@/lib/db-mappers";
import { analyzePerformance } from "@/lib/performance-analytics";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { syncUserPostMetrics } from "@/lib/sync-metrics";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const summary = analyzePerformance(posts.map(postToSaved));
    const topPosts = posts
      .map(postToSaved)
      .filter((p) => p.performance?.source === "api")
      .sort(
        (a, b) =>
          (b.performance?.engagementRate ?? 0) -
          (a.performance?.engagementRate ?? 0),
      )
      .slice(0, 5);

    return NextResponse.json({ summary, topPosts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const rl = checkRateLimit(userId as string, "metrics");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ~${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    const result = await syncUserPostMetrics(userId as string, { force });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}