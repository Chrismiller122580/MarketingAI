import { NextResponse } from "next/server";
import { planCampaign } from "@/lib/campaign-planner";
import type { BatchGenerateRequest } from "@/lib/types";
import { requirePaidUserId, isAuthError } from "@/lib/auth-helpers";
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

    const planRequest: BatchGenerateRequest = {
      site: body.site,
      settings: body.settings,
      prompt: body.prompt ?? "",
      platforms: body.platforms,
      maxPosts: Math.min(body.maxPosts ?? 9, 20),
      contentAngle: body.contentAngle,
      existingPosts: body.existingPosts,
      varyAngles: body.varyAngles,
    };

    const plan = await planCampaign(planRequest);

    const items = plan.items.slice(0, planRequest.maxPosts).map((item) => ({
      ...item,
      // client will compute scheduledFor using dayOffset
    }));

    return NextResponse.json({
      plan: { theme: plan.theme, source: plan.source },
      items,
      count: items.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to plan campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
