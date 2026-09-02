"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";

const PLATFORMS = [
  "twitter",
  "linkedin",
  "facebook",
  "instagram",
  "pinterest",
] as const;

function readSocialLinkSite(): string {
  try {
    const fromStore = localStorage.getItem("pendingSocialConnectSite");
    if (fromStore) return fromStore;
  } catch {
    /* private mode */
  }
  const match = document.cookie.match(/(?:^|; )crawlspark_link_site=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function clearSocialLinkSite() {
  try {
    localStorage.removeItem("pendingSocialConnectSite");
  } catch {
    /* ignore */
  }
  const cookieDomain = window.location.hostname.endsWith("crawlspark.ai")
    ? "; Domain=.crawlspark.ai"
    : "";
  document.cookie = `crawlspark_link_site=; Path=/; Max-Age=0; SameSite=Lax; Secure${cookieDomain}`;
}

/**
 * After social OAuth, links tokens to the pending site domain (from localStorage).
 * Does not require the site to already be loaded in context — fixes post-OAuth 404s.
 */
export function SocialLinker() {
  const { data: session, status, update } = useSession();
  const { site, loadSavedSite, loadSiteSocialConnections } = useSite();
  const linkingRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || linkingRef.current) {
      return;
    }

    const su = session.user as Record<string, unknown>;
    const hasMeta = Boolean(su.facebookAccessToken || su.instagramAccessToken);
    const pendingDomain = readSocialLinkSite();
    let pendingMetaUser = false;
    try {
      pendingMetaUser = localStorage.getItem("pendingMetaUserConnect") === "1";
    } catch {
      /* ignore */
    }

    const platformsToLink = pendingDomain
      ? PLATFORMS.filter((platform) => {
          if (platform === "twitter") return !!su.twitterAccessToken;
          if (platform === "linkedin") return !!su.linkedinAccessToken;
          if (platform === "facebook") return !!su.facebookAccessToken;
          if (platform === "instagram") return !!su.instagramAccessToken;
          if (platform === "pinterest") return !!su.pinterestAccessToken;
          return false;
        })
      : [];

    if (!pendingDomain && !pendingMetaUser) return;
    if (!hasMeta && platformsToLink.length === 0) return;

    try {
      if (sessionStorage.getItem("crawlspark_social_attempted") === "1") {
        return;
      }
      sessionStorage.setItem("crawlspark_social_attempted", "1");
    } catch {
      /* ignore */
    }

    linkingRef.current = true;

    (async () => {
      try {
        let linkSucceeded = false;
        let lastError: string | null = null;

        if (hasMeta || pendingMetaUser) {
          const connectRes = await fetch("/api/social/meta/connect", {
            method: "POST",
          });
          const connectData = await connectRes.json().catch(() => ({}));
          if (connectRes.ok) {
            try {
              localStorage.removeItem("pendingMetaUserConnect");
            } catch {
              /* ignore */
            }
            linkSucceeded = true;
          } else {
            lastError =
              typeof connectData.error === "string"
                ? connectData.error
                : "Could not save Facebook login.";
          }
        }

        if (pendingDomain && platformsToLink.length > 0) {
          const results = await Promise.all(
            platformsToLink.map(async (platform) => {
              const res = await fetch("/api/social/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  platform,
                  siteDomain: pendingDomain,
                }),
              });
              const data = await res.json().catch(() => ({}));
              return { platform, ok: res.ok, data };
            }),
          );

          const usable = results.filter(
            (r) => r.ok || r.data?.needsPageChoice,
          );
          if (usable.length > 0) {
            linkSucceeded = true;
            clearSocialLinkSite();
            if (!site || site.domain !== pendingDomain) {
              await loadSavedSite(pendingDomain);
            } else {
              await loadSiteSocialConnections();
            }
          } else {
            const failed = results.find(
              (r) => typeof r.data?.error === "string",
            );
            lastError =
              (failed?.data?.error as string | undefined) ||
              lastError ||
              "Could not finish connecting that account. Tap Connect Facebook again.";
          }
        }

        if (lastError && !linkSucceeded) {
          try {
            sessionStorage.setItem("crawlspark_social_error", lastError);
          } catch {
            /* ignore */
          }
        }

        await update();
      } catch (e) {
        console.error("Social linker failed", e);
      } finally {
        linkingRef.current = false;
      }
    })();
  }, [
    status,
    session,
    site,
    update,
    loadSavedSite,
    loadSiteSocialConnections,
  ]);

  return null;
}