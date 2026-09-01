import { NextResponse } from "next/server";
import { crawlDomain, normalizeDomain } from "@/lib/crawl";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { assertFreeCrawlAllowed } from "@/lib/quota";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const rl = checkRateLimit(userId, "crawl");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Crawl rate limit exceeded. Please retry in ~${rl.retryAfterSeconds}s.`, retryAfter: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const domain = typeof body.domain === "string" ? body.domain : "";

    if (!domain.trim()) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    normalizeDomain(domain);

    const quotaErr = await assertFreeCrawlAllowed(userId, domain);
    if (quotaErr) return quotaErr;

    const siteData = await crawlDomain(domain);
    return NextResponse.json(siteData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to crawl domain";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}