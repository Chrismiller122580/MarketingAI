import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteToData } from "@/lib/db-mappers";
import { normalizeDomain } from "@/lib/crawl";
import {
  isAuthError,
  requireEnterprisePlusUserId,
} from "@/lib/auth-helpers";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";
import {
  buildFactPinpoints,
  mergeFactsWithSite,
} from "@/lib/viraforge/site-facts-extractor";
import type { SiteData } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await requireEnterprisePlusUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const influencerId = body.influencerId as string | undefined;
    const domain = body.domain as string | undefined;
    const pagePath = (body.pagePath as string | undefined) ?? "/";
    const sitePayload = body.site as SiteData | undefined;

    if (!influencerId) {
      return NextResponse.json(
        { error: "influencerId is required" },
        { status: 400 },
      );
    }

    const influencer = await prisma.influencer.findFirst({
      where: { id: influencerId, userId: authResult },
      include: { productFacts: true },
    });

    if (!influencer?.productFacts) {
      return NextResponse.json(
        { error: "Influencer product facts required" },
        { status: 400 },
      );
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

    return NextResponse.json({
      domain: site.domain,
      page: { path: page.path, title: page.title },
      mergedFacts,
      pinpoints,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract site facts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}