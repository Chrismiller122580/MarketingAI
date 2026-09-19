import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { postFromGenerated, postToSaved } from "@/lib/db-mappers";
import { generateCampaignPack } from "@/lib/smart-generator";
import type { BatchGenerateRequest, Platform, SiteData } from "@/lib/types";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { getPromptPreferences } from "@/lib/learning-preferences";
import {
  assertFreeGenerationsAllowed,
  consumeGenerations,
  getQuotaSnapshot,
  remainingFreeGenerations,
} from "@/lib/quota";
import { checkRateLimit } from "@/lib/rate-limit";
import { loadWinningCopyHints } from "@/lib/winning-copy";
import {
  WEEK_PACK_PROMPT,
  WEEK_PACK_SIZE,
  resolveWeekPackPlatforms,
  unusedPagePaths,
} from "@/lib/week-pack";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const rl = checkRateLimit(userId, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Generation rate limit exceeded. Please retry in ~${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const site = body.site as SiteData | undefined;

    if (!site?.pages?.length) {
      return NextResponse.json(
        { error: "Crawl a website first, then generate this week's pack." },
        { status: 400 },
      );
    }

    const usage = await getQuotaSnapshot(userId);
    const requested = Math.min(
      Number(body.maxPosts) > 0 ? Number(body.maxPosts) : WEEK_PACK_SIZE,
      WEEK_PACK_SIZE,
    );
    if (!usage.paid) {
      const quotaErr = await assertFreeGenerationsAllowed(userId, 1);
      if (quotaErr) return quotaErr;
    }
    const remaining = remainingFreeGenerations(usage);
    const maxPosts = Number.isFinite(remaining)
      ? Math.min(requested, remaining)
      : requested;

    if (maxPosts < 1) {
      return NextResponse.json(
        {
          error: `Free includes ${usage.generationsLimit} posts this month. You've used them all.`,
          code: "QUOTA_EXCEEDED",
          upgradeUrl: "/billing",
          usage,
        },
        { status: 402 },
      );
    }

    const [promptPreferences, winningCopy, existingRows] = await Promise.all([
      getPromptPreferences(userId),
      loadWinningCopyHints(userId),
      prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
    ]);

    const existingPosts = existingRows.map((row) => {
      const post = postToSaved(row);
      return {
        text: post.text,
        sourcePage: post.sourcePage,
        platform: post.platform,
      };
    });

    const unused = unusedPagePaths(site, existingPosts);
    const platforms = resolveWeekPackPlatforms({
      paid: usage.paid,
      preferred: (body.settings?.defaultPlatforms ?? []) as Platform[],
      topPlatform: winningCopy?.topPlatform,
    });

    const batchRequest: BatchGenerateRequest = {
      site,
      settings: {
        ...body.settings,
        promptPreferences:
          promptPreferences ?? body.settings?.promptPreferences,
      },
      prompt: WEEK_PACK_PROMPT,
      platforms,
      maxPosts,
      preferAiImage: false,
      existingPosts,
      varyAngles: true,
      focusPagePaths: unused.length > 0 ? unused : undefined,
      winningCopy,
      spreadDaily: true,
    };

    const result = await generateCampaignPack(batchRequest);
    await consumeGenerations(userId, result.posts.length);

    const siteRow = await prisma.site.findUnique({
      where: { userId_domain: { userId, domain: site.domain } },
      select: { id: true },
    });

    const savedPosts = [];
    for (const post of result.posts) {
      const row = await prisma.post.create({
        data: {
          userId,
          ...postFromGenerated(
            { ...post, publishStatus: post.publishStatus ?? "draft" },
            siteRow?.id,
          ),
        },
      });
      savedPosts.push(postToSaved(row));
    }

    const packName = `This week — ${site.brand.name} — ${new Date().toLocaleDateString()}`;
    const pack = await prisma.campaignPack.create({
      data: { userId, name: packName, posts: savedPosts },
    });

    return NextResponse.json({
      posts: savedPosts,
      plan: { theme: result.plan.theme, source: result.plan.source },
      count: savedPosts.length,
      packId: pack.id,
      packName,
      saved: true,
      unusedPagesUsed: unused.length,
      learnedFromWins: Boolean(winningCopy?.hasMetrics),
      remaining:
        Number.isFinite(remaining) && usage.generationsLimit != null
          ? Math.max(0, remaining - savedPosts.length)
          : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate this week's pack";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
