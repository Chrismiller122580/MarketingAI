import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { platform, siteDomain } = await request.json();

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

    if (platform === "twitter" && (session.user as any).twitterAccessToken) {
      accessToken = (session.user as any).twitterAccessToken;
      // For Twitter, we can try to get the user id from the token or session if available
      // For simplicity, we can fetch it or store later
    } else if (platform === "linkedin" && (session.user as any).linkedinAccessToken) {
      accessToken = (session.user as any).linkedinAccessToken;
    } else if (platform === "facebook" && (session.user as any).facebookAccessToken) {
      accessToken = (session.user as any).facebookAccessToken;
    }

    if (!accessToken) {
      return NextResponse.json({ error: `No ${platform} token found in your session. Please connect via OAuth first.` }, { status: 400 });
    }

    // For Twitter we already set it in auth
    // For others, the providers we added should populate similar fields if configured correctly in session callback.

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
      },
      update: {
        accessToken,
        refreshToken: refreshToken || undefined,
        accountId: accountId || undefined,
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
