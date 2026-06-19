import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { postToSaved, siteToData, settingsToData } from "@/lib/db-mappers";
import {
  analyzeContentGaps,
  enrichStrategyRecommendations,
} from "@/lib/content-strategy";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import type { Platform, SiteData, UserSettings } from "@/lib/types";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const body = await request.json();
    const enrich = body.enrich === true;
    let site: SiteData | null = null;

    if (body.site?.pages?.length) {
      site = body.site as SiteData;
    } else if (body.domain) {
      const row = await prisma.site.findUnique({
        where: { userId_domain: { userId, domain: body.domain } },
      });
      if (row) site = siteToData(row);
    }

    if (!site) {
      return NextResponse.json(
        { error: "Site data required. Crawl a domain first." },
        { status: 400 },
      );
    }

    const [posts, settingsRow] = await Promise.all([
      prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userSettings.findUnique({ where: { userId } }),
    ]);

    const settings: UserSettings = settingsRow
      ? settingsToData(settingsRow)
      : {
          brandVoice: "",
          targetAudience: "",
          defaultPlatforms: ["instagram", "linkedin", "twitter"] as Platform[],
          includeHashtags: true,
          emojiStyle: "light",
          preferAiImages: false,
        };

    let analysis = analyzeContentGaps(
      site,
      posts.map(postToSaved),
      settings,
    );

    if (enrich) {
      const enriched = await enrichStrategyRecommendations(site, analysis);
      analysis = { ...analysis, recommendations: enriched };
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strategy analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}