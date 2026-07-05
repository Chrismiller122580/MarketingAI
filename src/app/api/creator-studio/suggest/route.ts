import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteToData } from "@/lib/db-mappers";
import { normalizeDomain } from "@/lib/crawl";
import {
  isAuthError,
  requirePaidUserId,
} from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { suggestAvatarFromSite } from "@/lib/viraforge/avatar-from-site";
import type { SiteData } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await requirePaidUserId();
  if (isAuthError(authResult)) return authResult;

  const rl = checkRateLimit(authResult, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Try again later.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const domain = body.domain as string | undefined;
    const sitePayload = body.site as SiteData | undefined;
    const useAi = body.useAi !== false;

    let site = sitePayload;
    if (!site?.pages?.length && domain) {
      let lookup = domain;
      try {
        lookup = normalizeDomain(domain);
      } catch {
        /* use raw */
      }
      const row = await prisma.site.findFirst({
        where: { userId: authResult, domain: lookup },
      });
      if (!row) {
        return NextResponse.json(
          {
            error:
              "Crawled site not found. Crawl the domain on the dashboard first.",
          },
          { status: 404 },
        );
      }
      site = siteToData(row);
    }

    if (!site?.pages?.length) {
      return NextResponse.json(
        { error: "Site data is required. Crawl a domain first." },
        { status: 400 },
      );
    }

    const suggestion = await suggestAvatarFromSite(site, { useAi });

    return NextResponse.json(suggestion);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to suggest avatar options";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}