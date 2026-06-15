import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  exchangeFacebookLongLivedToken,
  fetchFacebookUserId,
  resolveFacebookPageToken,
} from "@/lib/social/facebook";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { platform, siteDomain, pageId: preferredPageId } = body as {
      platform?: string;
      siteDomain?: string;
      pageId?: string;
    };

    if (!platform || !siteDomain) {
      return NextResponse.json({ error: "platform and siteDomain required" }, { status: 400 });
    }

    // Find the site owned by this user
    const site = await prisma.site.findFirst({
      where: {
        userId: session.user.id,
        domain: siteDomain,
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found or not owned by you" }, { status: 404 });
    }

    // Get token from session (for platforms we support via NextAuth)
    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    let accountId: string | undefined;

    const su = session.user as Record<string, unknown>;
    if (platform === "twitter" && su.twitterAccessToken) {
      accessToken = su.twitterAccessToken as string | undefined;
      // For Twitter, we can try to get the user id from the token or session if available
      // For simplicity, we can fetch it or store later
    } else if (platform === "linkedin" && su.linkedinAccessToken) {
      accessToken = su.linkedinAccessToken as string | undefined;
    } else if (platform === "facebook" && su.facebookAccessToken) {
      accessToken = su.facebookAccessToken as string | undefined;
    }

    if (!accessToken) {
      return NextResponse.json({ error: `No ${platform} token found in your session. Please connect via OAuth first.` }, { status: 400 });
    }

    let providerUserId: string | undefined;

    if (platform === "facebook") {
      providerUserId =
        (await fetchFacebookUserId(accessToken)) ?? undefined;

      const longLived = await exchangeFacebookLongLivedToken(accessToken);
      if (longLived.accessToken) {
        accessToken = longLived.accessToken;
        providerUserId =
          (await fetchFacebookUserId(accessToken)) ?? providerUserId;
      }

      const page = await resolveFacebookPageToken(
        accessToken,
        preferredPageId,
      );
      if (!page) {
        return NextResponse.json(
          {
            error:
              "No Facebook Pages found for this account. Ensure you are an admin of a Page and granted pages_show_list permission.",
          },
          { status: 400 },
        );
      }
      accessToken = page.accessToken;
      accountId = page.id;
    }

    // Upsert the connection for this site
    const connection = await prisma.siteSocialConnection.upsert({
      where: {
        siteId_platform: {
          siteId: site.id,
          platform,
        },
      },
      create: {
        siteId: site.id,
        platform,
        accessToken,
        refreshToken: refreshToken || null,
        accountId: accountId || null,
        providerUserId: providerUserId || null,
      },
      update: {
        accessToken,
        refreshToken: refreshToken || undefined,
        accountId: accountId || undefined,
        providerUserId: providerUserId || undefined,
        updatedAt: new Date(),
      },
    });

    // Clear pending
    // In real, we would clear from localStorage on client after this call

    return NextResponse.json({ success: true, connection });
  } catch (error) {
    console.error("Social link error", error);
    const message = error instanceof Error ? error.message : "Failed to link social account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
