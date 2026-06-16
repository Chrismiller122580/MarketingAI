"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";

/**
 * This component listens for a successful social OAuth and,
 * if there was a pending site (from clicking "Connect" for a specific domain),
 * it calls the link API to associate the new token with that site.
 */
export function SocialLinker() {
  const { data: session, status } = useSession();
  const { site, loadSiteSocialConnections } = useSite();

  useEffect(() => {
    const pendingDomain = localStorage.getItem("pendingSocialConnectSite");

    if (
      status === "authenticated" &&
      session?.user &&
      pendingDomain &&
      site?.domain === pendingDomain
    ) {
      // We have a pending site and the user just completed OAuth
      // Try to link for the platforms we support
      const platformsToTry = ["twitter", "linkedin", "facebook", "instagram", "pinterest"];

      const linkPromises = platformsToTry.map(async (platform) => {
        const hasToken =
          (platform === "twitter" && (session.user as any).twitterAccessToken) ||
          (platform === "linkedin" && (session.user as any).linkedinAccessToken) ||
          (platform === "facebook" && (session.user as any).facebookAccessToken) ||
          (platform === "instagram" && (session.user as any).instagramAccessToken) ||
          (platform === "pinterest" && (session.user as any).pinterestAccessToken);

        if (hasToken) {
          try {
            await fetch("/api/social/link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                platform,
                siteDomain: pendingDomain,
              }),
            });
          } catch (e) {
            console.error(`Failed to link ${platform} for site`, e);
          }
        }
      });

      Promise.all(linkPromises).then(() => {
        localStorage.removeItem("pendingSocialConnectSite");
        // Refresh the social connections for the current site
        loadSiteSocialConnections();
      });
    }
  }, [status, session, site, loadSiteSocialConnections]);

  return null;
}
