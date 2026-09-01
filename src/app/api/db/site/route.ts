import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteToData } from "@/lib/db-mappers";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { normalizeDomain } from "@/lib/crawl";
import { clearActiveSiteIfMatches } from "@/lib/active-site";
import { assertFreeCrawlAllowed } from "@/lib/quota";
import type { SiteData } from "@/lib/types";

export async function GET(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const domainParam = searchParams.get("domain");
  const listParam = searchParams.get("list");

  try {
    if (listParam === "true" || listParam === "1") {
      const rows = await prisma.site.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: {
          domain: true,
          crawledAt: true,
          brand: true,
          pages: true,
          images: true,
        },
      });
      const sites = rows.map((r) => ({
        domain: r.domain,
        crawledAt: r.crawledAt.toISOString(),
        brandName: ((r.brand as Record<string, unknown>)?.name as string) || r.domain,
        pages: Array.isArray(r.pages) ? r.pages.length : 0,
        images: Array.isArray(r.images) ? r.images.length : 0,
      }));
      return NextResponse.json({ sites });
    }

    if (domainParam) {
      let lookup = domainParam;
      try {
        lookup = normalizeDomain(domainParam);
      } catch {}
      const site = await prisma.site.findFirst({
        where: { userId, domain: lookup },
      });
      if (!site) return NextResponse.json({ site: null });
      return NextResponse.json({ site: siteToData(site) });
    }

    // default: active site from settings, else latest (legacy fallback)
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { activeSiteDomain: true, activeSiteChosen: true },
    });

    if (settings?.activeSiteChosen && settings.activeSiteDomain) {
      const site = await prisma.site.findFirst({
        where: { userId, domain: settings.activeSiteDomain },
      });
      if (site) return NextResponse.json({ site: siteToData(site) });
    }

    if (!settings?.activeSiteChosen) {
      const site = await prisma.site.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      if (site) return NextResponse.json({ site: siteToData(site) });
    }

    return NextResponse.json({ site: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const body = await request.json();
    const siteData = body.site as SiteData;

    if (!siteData?.domain || !siteData.pages) {
      return NextResponse.json({ error: "Invalid site data" }, { status: 400 });
    }

    const quotaErr = await assertFreeCrawlAllowed(userId, siteData.domain);
    if (quotaErr) return quotaErr;

    const site = await prisma.site.upsert({
      where: {
        userId_domain: { userId, domain: siteData.domain },
      },
      create: {
        userId,
        domain: siteData.domain,
        crawledAt: new Date(siteData.crawledAt),
        brand: siteData.brand,
        pages: siteData.pages,
        images: siteData.images,
      },
      update: {
        crawledAt: new Date(siteData.crawledAt),
        brand: siteData.brand,
        pages: siteData.pages,
        images: siteData.images,
      },
    });

    return NextResponse.json({ site: siteToData(site) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const domainParam = searchParams.get("domain");

  if (!domainParam) {
    return NextResponse.json(
      { error: "domain query parameter is required to delete a site" },
      { status: 400 },
    );
  }

  try {
    let lookup = domainParam;
    try {
      lookup = normalizeDomain(domainParam);
    } catch {}

    const deleted = await prisma.site.deleteMany({
      where: { userId, domain: lookup },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    await clearActiveSiteIfMatches(userId, lookup);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}