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
import { factsFromRecord } from "@/lib/schemas/product-facts-schema";
import { generateInfluencerSiteContent } from "@/lib/viraforge/influencer-content";
import { generateInfluencerScript } from "@/lib/viraforge/influencer-script";
import {
  mergeInfluencerAssets,
  resolveInfluencerAssets,
  type InfluencerAssets,
  type InfluencerMotionType,
} from "@/lib/viraforge/influencer-assets";
import { recordCreatorEvent } from "@/lib/viraforge/learning";
import {
  buildFactPinpointsFromSites,
  mergeFactsWithSites,
} from "@/lib/viraforge/site-facts-extractor";
import {
  canGenerateFreshMotion,
  startContentStudioMotionClips,
} from "@/lib/viraforge/content-studio-motion";
import { loadInfluencerGenerateContext } from "@/lib/viraforge/influencer-bridge";
import { findUsableInfluencer } from "@/lib/viraforge/avatar-world";
import {
  DEFAULT_PRESENT_MOTION_TYPES,
  normalizeMotionTypeSelection,
} from "@/lib/viraforge/motion-actions";
import { buildContentStudioHandoffUrl } from "@/lib/viraforge/present-handoff";
import { loadCrawledCorpus } from "@/lib/crawled-content";
import type { Platform, SiteData } from "@/lib/types";

const motionTypeSchema = z.enum([
  "talk",
  "walk-talk",
  "walk",
  "spin",
  "jump",
  "wave",
  "point",
]);

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
  motionTypes: z.array(motionTypeSchema).max(2).optional(),
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

    const {
      influencerId,
      domain,
      pagePath,
      platform,
      talkNow,
    } = parsed.data;
    const motionTypes = normalizeMotionTypeSelection(
      (parsed.data.motionTypes as InfluencerMotionType[] | undefined) ??
        DEFAULT_PRESENT_MOTION_TYPES,
    );
    const renderMotion = talkNow !== false;
    let site = parsed.data.site as SiteData | undefined;

    const usable = await findUsableInfluencer(authResult, influencerId);
    const influencer = usable?.influencer;

    if (!influencer) {
      return NextResponse.json(
        { error: "That avatar is not available" },
        { status: 400 },
      );
    }

    const persona = parseCreatorAvatar(influencer.persona);
    if (!persona.success) {
      return NextResponse.json({ error: "Invalid persona data" }, { status: 500 });
    }

    const assets = resolveInfluencerAssets(
      (influencer.assets ?? {}) as InfluencerAssets,
    );
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

    const crawledCorpus = await loadCrawledCorpus(authResult, site);
    const locked = factsFromRecord(influencer.productFacts);
    const mergedFacts = mergeFactsWithSites(
      locked,
      crawledCorpus.sites,
      page,
    );
    const pinpoints = buildFactPinpointsFromSites(
      locked,
      crawledCorpus.sites,
      page,
    );
    const context = await loadInfluencerGenerateContext(
      authResult,
      influencerId,
      site,
      page,
      crawledCorpus.sites,
    );
    if (!context) {
      return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
    }

    const content = await generateInfluencerSiteContent({
      persona: persona.data,
      facts: mergedFacts,
      pinpoints,
      site,
      page,
      platform: platform as Platform,
      personalization: context.personalization,
      worldLife: context.worldLife,
      crawledCorpus,
    });

    const scriptResult = await generateInfluencerScript({
      persona: persona.data,
      facts: mergedFacts,
      scene: "pitch",
      siteDomain: site.domain,
      draftText: content.text,
      personalization: context.personalization,
      worldLife: context.worldLife,
    });

    const contentStudioUrl = buildContentStudioHandoffUrl({
      influencerId,
      domain: site.domain,
      pagePath: page.path,
      platform: platform as Platform,
      motionTypes,
    });
    const creatorStudioUrl = `/creator-studio?influencer=${encodeURIComponent(influencerId)}`;

    let clips:
      | Array<{
          motionType: InfluencerMotionType;
          motionJobId: string;
          voiceAudioUrl?: string;
          script?: string;
        }>
      | undefined;
    let talkError: string | undefined;
    let talkSkipped: string | undefined;

    if (renderMotion) {
      if (!canGenerateFreshMotion(motionTypes)) {
        talkError = "Those motion clips aren't available right now.";
      } else {
        const motionResult = await startContentStudioMotionClips({
          userId: authResult,
          influencer: context,
          motionTypes,
          draftText: content.text,
          siteDomain: site.domain,
        });
        clips = motionResult.clips;
        if ("error" in motionResult) {
          if (motionResult.error.toLowerCase().includes("rate limit")) {
            talkSkipped = motionResult.error;
          } else {
            talkError = motionResult.error;
          }
        } else if (clips?.[0]) {
          const primary = clips[0];
          await prisma.influencer.update({
            where: { id: influencerId },
            data: {
              assets: mergeInfluencerAssets(assets, {
                motionType: primary.motionType,
                motionJobId: primary.motionJobId,
                motionStatus: "processing",
                ...(primary.voiceAudioUrl
                  ? {
                      voiceAudioUrl: primary.voiceAudioUrl,
                      lastScript: primary.script ?? scriptResult.script,
                    }
                  : {}),
              }),
            },
          });
          await recordCreatorEvent(
            authResult,
            "generate",
            {
              motionType: primary.motionType,
              jobId: primary.motionJobId,
              source: "present",
              motionTypes,
            },
            influencerId,
          );
        }
      }
    }

    await recordCreatorEvent(
      authResult,
      "save",
      {
        type: "present",
        domain: site.domain,
        pagePath: page.path,
        citedCount: content.citedFacts.length,
        motionTypes,
        clipCount: clips?.length ?? 0,
      },
      influencerId,
    );

    const spokenScript =
      clips?.find((clip) => clip.script)?.script ?? scriptResult.script;

    return NextResponse.json({
      content,
      script: spokenScript,
      scriptValidation: scriptResult.validation,
      motionTypes,
      clips: clips ?? [],
      motionJobId: clips?.[0]?.motionJobId,
      contentStudioUrl,
      creatorStudioUrl,
      ...(talkError ? { talkError } : {}),
      ...(talkSkipped ? { talkSkipped } : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Presentation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
