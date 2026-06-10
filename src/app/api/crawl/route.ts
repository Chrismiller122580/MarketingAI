import { NextResponse } from "next/server";
import { crawlDomain, normalizeDomain } from "@/lib/crawl";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const domain = typeof body.domain === "string" ? body.domain : "";

    if (!domain.trim()) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    normalizeDomain(domain);
    const siteData = await crawlDomain(domain);
    return NextResponse.json(siteData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to crawl domain";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}