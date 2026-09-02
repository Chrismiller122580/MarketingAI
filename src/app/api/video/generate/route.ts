import { NextResponse } from "next/server";
import { hasVideoProvider } from "@/lib/ai-video";
import { startVideoGeneration } from "@/lib/video-generator";
import { requirePaidUserId, isAuthError } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Platform, SiteData } from "@/lib/types";

export async function POST(request: Request) {
  const userId = await requirePaidUserId();
  if (isAuthError(userId)) return userId;

  const rl = checkRateLimit(userId as string, "video");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Video generation rate limit exceeded. Please retry in ~${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  if (!hasVideoProvider()) {
    return NextResponse.json(
      {
        error:
          "Video isn't available right now. Publish an image post, or try again later.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const site = body.site as SiteData;
    const platform = (body.platform ?? "instagram") as Platform;
    const prompt = (body.prompt ?? "") as string;
    const durationSec = (body.durationSec === 10 ? 10 : 5) as 5 | 10;

    if (!site?.pages?.length) {
      return NextResponse.json(
        { error: "Site data is required. Crawl a domain first." },
        { status: 400 },
      );
    }

    const result = await startVideoGeneration(userId as string, site, platform, {
      prompt,
      sourcePageUrl: body.sourcePageUrl,
      durationSec,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      jobId: result.jobId,
      status: "processing",
      prompt: result.prompt,
      aspectRatio: result.aspectRatio,
      durationSec: result.durationSec,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}