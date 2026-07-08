import { NextResponse } from "next/server";
import { generateCampaignPack } from "@/lib/smart-generator";
import type { BatchGenerateRequest } from "@/lib/types";
import { requirePaidUserId, isAuthError } from "@/lib/auth-helpers";
import { getPromptPreferences } from "@/lib/learning-preferences";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const userId = await requirePaidUserId();
  if (isAuthError(userId)) return userId;

  const rl = checkRateLimit(userId as string, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Generation rate limit exceeded. Please retry in ~${rl.retryAfterSeconds}s.`, retryAfter: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();

    if (!body.site?.pages?.length) {
      return NextResponse.json(
        { error: "Site data is required. Crawl a domain first." },
        { status: 400 },
      );
    }

    const promptPreferences = await getPromptPreferences(userId as string);

    const batchRequest: BatchGenerateRequest = {
      site: body.site,
      settings: {
        ...body.settings,
        promptPreferences: promptPreferences ?? body.settings?.promptPreferences,
      },
      prompt: body.prompt ?? "",
      platforms: body.platforms,
      maxPosts: Math.min(body.maxPosts ?? 9, 20),
      preferAiImage: body.preferAiImage,
      visualTargeting: body.visualTargeting,
      contentAngle: body.contentAngle,
      existingPosts: body.existingPosts,
      varyAngles: body.varyAngles,
      focusPagePaths: body.focusPagePaths,
    };

    const result = await generateCampaignPack(batchRequest);
    return NextResponse.json({ posts: result.posts, plan: { theme: result.plan.theme, source: result.plan.source }, count: result.posts.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate campaign pack";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}