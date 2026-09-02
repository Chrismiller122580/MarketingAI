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
    const pendingDomain = readSocialLinkSite();
    if (
      status !== "authenticated" ||
      !session?.user?.id ||
      !pendingDomain ||
      linkingRef.current
    ) {
      return;
    }

    const su = session.user as Record<string, unknown>;
    const platformsToLink = PLATFORMS.filter((platform) => {
      if (platform === "twitter") return !!su.twitterAccessToken;
      if (platform === "linkedin") return !!su.linkedinAccessToken;
      if (platform === "facebook") return !!su.facebookAccessToken;
      if (platform === "instagram") return !!su.instagramAccessToken;
      if (platform === "pinterest") return !!su.pinterestAccessToken;
      return false;
    });

    if (platformsToLink.length === 0) return;

    linkingRef.current = true;

    (async () => {
      try {
        await Promise.all(
          platformsToLink.map(async (platform) => {
            const res = await fetch("/api/social/link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                platform,
                siteDomain: pendingDomain,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              console.warn(
                `Social link ${platform}:`,
                data.error ?? res.status,
              );
            }
          }),
        );

        clearSocialLinkSite();

        // Restore subscription fields after OAuth (plan must not revert to free)
        await update();

        // Reload site so "Connect accounts for this site" panel stays visible
        if (!site || site.domain !== pendingDomain) {
          await loadSavedSite(pendingDomain);
        } else {
          await loadSiteSocialConnections();
        }
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