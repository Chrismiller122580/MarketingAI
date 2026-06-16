import { NextResponse } from "next/server";
import { generateAiImage } from "@/lib/ai-image";
import type { Platform, SiteData, SitePage } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const site = body.site as SiteData;
    const page = body.page as SitePage;
    const platform = (body.platform ?? "instagram") as Platform;

    if (!site?.brand || !page?.title) {
      return NextResponse.json(
        { error: "Site and page data required" },
        { status: 400 },
      );
    }

    const result = await generateAiImage(site, page, platform, body.visualTargeting);

    if (!result) {
      return NextResponse.json(
        {
          error:
            "AI image generation unavailable. Add OPENAI_API_KEY or XAI_API_KEY.",
        },
        { status: 503 },
      );
    }

    if (result.url.startsWith("data:")) {
      return NextResponse.json({
        url: result.url,
        prompt: result.prompt,
        source: "ai",
        provider: result.provider,
      });
    }

    const imageResponse = await fetch(result.url);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch generated image" },
        { status: 500 },
      );
    }

    const buffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType =
      imageResponse.headers.get("content-type") ?? "image/png";

    return NextResponse.json({
      url: `data:${contentType};base64,${base64}`,
      prompt: result.prompt,
      source: "ai",
      provider: result.provider,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}