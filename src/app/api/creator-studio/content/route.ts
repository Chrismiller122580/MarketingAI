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
import { creatorAvatarSchema } from "@/lib/schemas/creator-avatar-schema";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";
import { generateInfluencerSiteContent } from "@/lib/viraforge/influencer-content";
import {
  buildPersonalizationContext,
  recordCreatorEvent,
} from "@/lib/viraforge/learning";
import { createInfluencerRender } from "@/lib/viraforge/influencer-renders";
import {
  buildFactPinpoints,
  mergeFactsWithSite,
} from "@/lib/viraforge/site-facts-extractor";
import type { Platform, SiteData } from "@/lib/types";

const contentSchema = z.object({
  influencerId: z.string().min(1),
  domain: z.string().optional(),
  pagePath: z.string().optional(),
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
  brief: z.string().max(500).optional(),
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
    const parsed = contentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { influencerId, domain, pagePath, platform, brief } = parsed.data;
    const sitePayload = parsed.data.site as SiteData | undefined;

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

    const persona = creatorAvatarSchema.safeParse(influencer.persona);
    if (!persona.success) {
      return NextResponse.json({ error: "Invalid persona data" }, { status: 500 });
    }

    let site = sitePayload;
    if (!site?.pages?.length && domain) {
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
          { error: "Crawled site not found. Crawl the domain on the dashboard first." },
          { status: 404 },
        );
      }
      site = siteToData(row);
    }

    if (!site?.pages?.length) {
      return NextResponse.json(
        { error: "Site data is required. Crawl a domain first." },
        { status: 400 },
      );
    }

    const page =
      site.pages.find((p) => p.path === (pagePath ?? "/")) ?? site.pages[0];

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

    const result = await generateInfluencerSiteContent({
      persona: persona.data,
      facts: mergedFacts,
      pinpoints,
      site,
      page,
      platform: platform as Platform,
      brief,
      personalization: personalization || undefined,
    });

    await recordCreatorEvent(
      authResult,
      "save",
      {
        type: "site_content",
        domain: site.domain,
        pagePath: page.path,
        citedCount: result.citedFacts.length,
        platform,
      },
      influencerId,
    );

    const { id: renderId } = await createInfluencerRender({
      userId: authResult,
      influencerId,
      type: "site_content",
      status: "ready",
      script: result.text,
      metadata: {
        domain: site.domain,
        pagePath: page.path,
        platform,
        brief,
        citedFacts: result.citedFacts,
        sourcePage: result.sourcePage,
        validation: result.validation,
      },
      activate: false,
    });

    return NextResponse.json({ ...result, renderId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}