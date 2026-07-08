import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { siteToData } from "@/lib/db-mappers";
import { normalizeDomain } from "@/lib/crawl";
import {
  isAuthError,
  requireEnterprisePlusUserId,
} from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseCreatorAvatar } from "@/lib/schemas/creator-avatar-schema";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";
import { createInfluencerMotionJob } from "@/lib/influencer-motion-jobs";
import { generateInfluencerSiteContent } from "@/lib/viraforge/influencer-content";
import { generateInfluencerScript } from "@/lib/viraforge/influencer-script";
import { hasElevenLabs } from "@/lib/viraforge/elevenlabs";
import {
  mergeInfluencerAssets,
  type InfluencerAssets,
} from "@/lib/viraforge/influencer-assets";
import { startInfluencerMotion } from "@/lib/viraforge/influencer-motion";
import { prepareMotionPortrait } from "@/lib/viraforge/influencer-renders";
import {
  buildPersonalizationContext,
  recordCreatorEvent,
} from "@/lib/viraforge/learning";
import {
  buildFactPinpoints,
  mergeFactsWithSite,
} from "@/lib/viraforge/site-facts-extractor";
import { hasReplicate } from "@/lib/replicate-client";
import type { Platform, SiteData } from "@/lib/types";

const presentSchema = z.object({
  influencerId: z.string().min(1),
  domain: z.string().min(1),
  pagePath: z.string().default("/"),
  platform: z
    .enum([
      "instagram",
      "twitter",
      "linkedin",
      "facebook",
      "pinterest",
      "email",
    ])
    .default("instagram"),
  talkNow: z.boolean().optional(),
  site: z.unknown().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireEnterprisePlusUserId();
  if (isAuthError(authResult)) return authResult;

  const rl = checkRateLimit(authResult, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Retry in ~${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = presentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { influencerId, domain, pagePath, platform, talkNow } = parsed.data;
    let site = parsed.data.site as SiteData | undefined;

    const influencer = await prisma.influencer.findFirst({
      where: { id: influencerId, userId: authResult },
      include: { productFacts: true },
    });

    if (!influencer?.productFacts) {
      return NextResponse.json(
        { error: "Save influencer with product facts first" },
        { status: 400 },
      );
    }

    const persona = parseCreatorAvatar(influencer.persona);
    if (!persona.success) {
      return NextResponse.json({ error: "Invalid persona data" }, { status: 500 });
    }

    const assets = (influencer.assets ?? {}) as InfluencerAssets;
    if (!assets.portraitUrl) {
      return NextResponse.json(
        { error: "Generate a portrait before presenting pages" },
        { status: 400 },
      );
    }

    if (!site?.pages?.length) {
      let lookup = domain;
      try {
        lookup = normalizeDomain(domain);
      } catch {
        /* use raw */
      }
      const row = await prisma.site.findFirst({
        where: { userId: authResult, domain: lookup },
      });
      if (!row) {
        return NextResponse.json(
          { error: "Crawled site not found. Crawl the domain first." },
          { status: 404 },
        );
      }
      site = siteToData(row);
    }

    const page =
      site.pages.find((p) => p.path === pagePath) ?? site.pages[0];

    const locked = productFactsSchema.parse({
      name: influencer.productFacts.name,
      price: influencer.productFacts.price,
      features: influencer.productFacts.features,
      location: influencer.productFacts.location ?? undefined,
      hours: influencer.productFacts.hours ?? undefined,
      ingredients: influencer.productFacts.ingredients,
    });

    const mergedFacts = mergeFactsWithSite(locked, site, page);
    const pinpoints = buildFactPinpoints(locked, site, page);
    const personalization = await buildPersonalizationContext(
      authResult,
      influencerId,
    );

    const content = await generateInfluencerSiteContent({
      persona: persona.data,
      facts: mergedFacts,
      pinpoints,
      site,
      page,
      platform: platform as Platform,
      personalization: personalization || undefined,
    });

    const scriptResult = await generateInfluencerScript({
      persona: persona.data,
      facts: mergedFacts,
      scene: "pitch",
      siteDomain: site.domain,
      draftText: content.text,
      personalization: personalization || undefined,
    });

    let motionJobId: string | undefined;

    if (talkNow) {
      if (!hasReplicate() || !hasElevenLabs()) {
        return NextResponse.json(
          {
            error:
              "Talk clips require REPLICATE_API_TOKEN and ELEVENLABS_API_KEY.",
            content,
            script: scriptResult.script,
            contentStudioUrl: buildContentStudioUrl(
              influencerId,
              site.domain,
              page.path,
            ),
          },
          { status: 503 },
        );
      }

      const motionRl = checkRateLimit(authResult, "motion");
      if (!motionRl.allowed) {
        return NextResponse.json({
          content,
          script: scriptResult.script,
          contentStudioUrl: buildContentStudioUrl(
            influencerId,
            site.domain,
            page.path,
          ),
          talkSkipped: `Motion rate limit — retry in ~${motionRl.retryAfterSeconds}s`,
        });
      }

      const portrait = await prepareMotionPortrait(
        authResult,
        influencerId,
        assets.portraitUrl,
      );

      const started = await startInfluencerMotion(
        "talk",
        portrait,
        persona.data,
        scriptResult.script,
        assets.voiceId,
      );

      if ("error" in started) {
        return NextResponse.json({
          content,
          script: scriptResult.script,
          contentStudioUrl: buildContentStudioUrl(
            influencerId,
            site.domain,
            page.path,
          ),
          talkError: started.error,
        });
      }

      const job = await createInfluencerMotionJob({
        userId: authResult,
        influencerId,
        predictionId: started.predictionId,
        motionType: "talk",
        voiceAudioUrl: started.voiceAudioUrl,
        script: scriptResult.script,
      });

      motionJobId = job.jobId;

      const nextAssets = mergeInfluencerAssets(assets, {
        motionType: "talk",
        motionJobId: job.jobId,
        motionStatus: "processing",
        ...(started.voiceAudioUrl
          ? {
              voiceAudioUrl: started.voiceAudioUrl,
              voiceId: started.voiceId,
              lastScript: scriptResult.script,
            }
          : {}),
      });

      await prisma.influencer.update({
        where: { id: influencerId },
        data: { assets: nextAssets },
      });

      await recordCreatorEvent(
        authResult,
        "generate",
        { motionType: "talk", jobId: job.jobId, source: "present" },
        influencerId,
      );
    }

    await recordCreatorEvent(
      authResult,
      "save",
      {
        type: "present",
        domain: site.domain,
        pagePath: page.path,
        citedCount: content.citedFacts.length,
      },
      influencerId,
    );

    return NextResponse.json({
      content,
      script: scriptResult.script,
      scriptValidation: scriptResult.validation,
      motionJobId,
      contentStudioUrl: buildContentStudioUrl(
        influencerId,
        site.domain,
        page.path,
      ),
      creatorStudioUrl: `/creator-studio?influencer=${encodeURIComponent(influencerId)}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Presentation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildContentStudioUrl(
  influencerId: string,
  domain: string,
  pagePath: string,
): string {
  const params = new URLSearchParams({
    influencer: influencerId,
    domain,
    page: pagePath,
  });
  return `/content?${params.toString()}`;
}