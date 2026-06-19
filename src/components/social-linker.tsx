"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
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

/**
 * After social OAuth, links tokens to the pending site domain (from localStorage).
 * Does not require the site to already be loaded in context — fixes post-OAuth 404s.
 */
export function SocialLinker() {
  const { data: session, status, update } = useSession();
  const { site, loadSavedSite, loadSiteSocialConnections } = useSite();
  const linkingRef = useRef(false);

  useEffect(() => {
    const pendingDomain = localStorage.getItem("pendingSocialConnectSite");
    if (
      status !== "authenticated" ||
      !session?.user ||
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

        localStorage.removeItem("pendingSocialConnectSite");

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