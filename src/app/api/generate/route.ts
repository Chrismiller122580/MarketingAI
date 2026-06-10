import { NextResponse } from "next/server";
import { generateSmartPost } from "@/lib/smart-generator";
import type { GenerateRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.site?.pages?.length) {
      return NextResponse.json(
        { error: "Site data is required. Crawl a domain first." },
        { status: 400 },
      );
    }

    const generateRequest: GenerateRequest = {
      site: body.site,
      contentType: body.contentType ?? "Social Post",
      platform: body.platform ?? "instagram",
      prompt: body.prompt ?? "",
      sourcePageUrl: body.sourcePageUrl,
      settings: body.settings,
    };

    const post = await generateSmartPost(generateRequest);
    return NextResponse.json(post);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}