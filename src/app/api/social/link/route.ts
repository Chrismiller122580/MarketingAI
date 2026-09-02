import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { assertFreeSocialAllowed } from "@/lib/quota";
import { fetchFacebookPages } from "@/lib/social/facebook";
import { resolveInstagramAccount } from "@/lib/social/instagram";
import { getMetaLogin, persistMetaUserToken, resolveMetaUserToken } from "@/lib/social/meta-login";
import { resolvePinterestBoard } from "@/lib/social/pinterest";
import { normalizeDomain } from "@/lib/crawl";

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { platform, siteDomain, pageId: preferredPageId, boardId, recipientEmail } = body as {
      platform?: string;
      siteDomain?: string;
      pageId?: string;
      boardId?: string;
      recipientEmail?: string;
    };

    if (!platform || !siteDomain) {
      return NextResponse.json({ error: "platform and siteDomain required" }, { status: 400 });
    }

    const socialQuota = await assertFreeSocialAllowed(userId, platform);
    if (socialQuota) return socialQuota;

    let normalizedDomain = siteDomain;
    try {
      normalizedDomain = normalizeDomain(siteDomain);
    } catch {
      /* use raw */
    }

    const site = await prisma.site.findFirst({
      where: {
        userId: session.user.id,
        OR: [{ domain: normalizedDomain }, { domain: siteDomain }],
      },
    });

    if (!site) {
      return NextResponse.json(
        {
          error:
            "Site not found. Crawl and save this domain first, then connect social accounts.",
        },
        { status: 404 },
      );
    }

    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    let accountId: string | undefined;

    if (platform === "email") {
      const email = recipientEmail?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Valid recipientEmail is required for email." }, { status: 400 });
      }
      accessToken = "recipient";
      accountId = email;
    } else {
      const su = session.user as Record<string, unknown>;
      if (platform === "twitter" && su.twitterAccessToken) {
        accessToken = su.twitterAccessToken as string | undefined;
      } else if (platform === "linkedin" && su.linkedinAccessToken) {
        accessToken = su.linkedinAccessToken as string | undefined;
      } else if (platform === "facebook" && su.facebookAccessToken) {
        accessToken = su.facebookAccessToken as string | undefined;
      } else if (platform === "instagram" && su.instagramAccessToken) {
        accessToken = su.instagramAccessToken as string | undefined;
      } else if (platform === "pinterest" && su.pinterestAccessToken) {
        accessToken = su.pinterestAccessToken as string | undefined;
      }

      if (!accessToken) {
        if (platform === "facebook" || platform === "instagram") {
          accessToken = await resolveMetaUserToken({
            userId,
            sessionToken: undefined,
          });
        }
      }

      if (!accessToken) {
        return NextResponse.json({ error: `No ${platform} token found in your session. Please connect via OAuth first.` }, { status: 400 });
      }
    }

    if (platform === "linkedin" && accessToken) {
      try {
        const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) {
          const me = (await meRes.json()) as { sub?: string };
          if (me.sub) {
            accountId = me.sub.startsWith("urn:")
              ? me.sub
              : `urn:li:person:${me.sub}`;
          }
        }
      } catch {
        /* fall through */
      }
      if (!accountId) {
        try {
          const meRes = await fetch("https://api.linkedin.com/v2/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (meRes.ok) {
            const me = (await meRes.json()) as { id?: string };
            if (me.id) accountId = `urn:li:person:${me.id}`;
          }
        } catch {
          /* optional */
        }
      }
      if (!accountId) {
        const linkedAccount = await prisma.account.findFirst({
          where: { userId, provider: "linkedin" },
          select: { providerAccountId: true },
        });
        if (linkedAccount?.providerAccountId) {
          accountId = `urn:li:person:${linkedAccount.providerAccountId}`;
        }
      }
    }

    let providerUserId: string | undefined;

    if (platform === "facebook") {
      const stored = await getMetaLogin(userId);
      if (stored?.accessToken) {
        accessToken = stored.accessToken;
        providerUserId = stored.userId ?? undefined;
      } else {
        const saved = await persistMetaUserToken(
          userId,
          accessToken,
          "facebook",
        );
        if (saved?.accessToken) accessToken = saved.accessToken;
        providerUserId = saved?.userId ?? undefined;
      }

      const pages = await fetchFacebookPages(accessToken);
      if (pages.length === 0) {
        return NextResponse.json(
          {
            error:
              "No Facebook Pages found for this Meta login. You must be an admin of a Page — a personal profile is not enough.",
            pages: [],
          },
          { status: 400 },
        );
      }

      if (!preferredPageId && pages.length > 1) {
        return NextResponse.json({
          success: false,
          needsPageChoice: true,
          pages: pages.map((p) => ({ id: p.id, name: p.name })),
        });
      }

      const page = preferredPageId
        ? (pages.find((p) => p.id === preferredPageId) ?? pages[0])
        : pages[0];
      accessToken = page.accessToken;
      accountId = page.id;
    }

    if (platform === "instagram") {
      const stored = await getMetaLogin(userId);
      if (stored?.accessToken) {
        accessToken = stored.accessToken;
        providerUserId = stored.userId ?? undefined;
      } else {
        const saved = await persistMetaUserToken(
          userId,
          accessToken,
          "instagram",
        );
        if (saved?.accessToken) accessToken = saved.accessToken;
        providerUserId = saved?.userId ?? undefined;
      }

      const igAccount = await resolveInstagramAccount(
        accessToken,
        preferredPageId,
      );
      if (!igAccount) {
        return NextResponse.json(
          {
            error:
              "No Instagram Business account found. Link IG to a Facebook Page and grant instagram_basic + instagram_content_publish.",
          },
          { status: 400 },
        );
      }

      accessToken = igAccount.accessToken;
      accountId = igAccount.igUserId;
    }

    if (platform === "pinterest") {
      const board = await resolvePinterestBoard(accessToken, boardId);
      if (!board) {
        return NextResponse.json(
          {
            error:
              "No Pinterest boards found. Create a board in Pinterest and grant boards:read + pins:write scopes.",
          },
          { status: 400 },
        );
      }
      accessToken = board.accessToken;
      accountId = board.boardId;
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

    return NextResponse.json({
      success: true,
      connection: {
        platform: connection.platform,
        accountId: connection.accountId,
        connected: true,
      },
    });
  } catch (error) {
    console.error("Social link error", error);
    const message = error instanceof Error ? error.message : "Failed to link social account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
