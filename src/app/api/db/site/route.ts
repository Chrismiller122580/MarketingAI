import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteToData } from "@/lib/db-mappers";
import type { SiteData } from "@/lib/types";

export async function GET() {
  try {
    const site = await prisma.site.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    if (!site) {
      return NextResponse.json({ site: null });
    }
    return NextResponse.json({ site: siteToData(site) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const siteData = body.site as SiteData;

    if (!siteData?.domain || !siteData.pages) {
      return NextResponse.json({ error: "Invalid site data" }, { status: 400 });
    }

    const site = await prisma.site.upsert({
      where: { domain: siteData.domain },
      create: {
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

export async function DELETE() {
  try {
    await prisma.site.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}