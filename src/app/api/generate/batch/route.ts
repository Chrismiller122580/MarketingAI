import { NextResponse } from "next/server";
import { generateCampaignPack } from "@/lib/smart-generator";
import type { BatchGenerateRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.site?.pages?.length) {
      return NextResponse.json(
        { error: "Site data is required. Crawl a domain first." },
        { status: 400 },
      );
    }

    const batchRequest: BatchGenerateRequest = {
      site: body.site,
      settings: body.settings,
      prompt: body.prompt ?? "",
      platforms: body.platforms,
      maxPosts: Math.min(body.maxPosts ?? 9, 20),
    };

    const posts = await generateCampaignPack(batchRequest);
    return NextResponse.json({ posts, count: posts.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate campaign pack";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}