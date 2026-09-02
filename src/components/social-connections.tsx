"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";
import { isFreeSocialPlatform, sessionIsPaid } from "@/lib/plans";

type MetaPageOption = {
  id: string;
  name: string;
  instagram: { id: string; username: string | null } | null;
};

type MetaAccountsResponse = {
  connected: boolean;
  loginName?: string | null;
  email?: string | null;
  pages?: MetaPageOption[];
};

const PLATFORMS = [
  "twitter",
  "linkedin",
  "facebook",
  "instagram",
  "pinterest",
] as const;

function platformLabel(platform: string) {
  if (platform === "twitter") return "X";
  if (platform === "facebook") return "Facebook / Meta";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function SocialConnections() {
  const [metaAccounts, setMetaAccounts] = useState<MetaAccountsResponse | null>(
    null,
  );
  const [pickingPage, setPickingPage] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const { data: session } = useSession();
  const {
    site,
    savedSites,
    loadSavedSite,
    siteSocialConnections,
    connectSocial,
    loadSiteSocialConnections,
    quotaExceeded,
    error,
  } = useSite();
  const paid = sessionIsPaid(
    session?.user as {
      plan?: string;
      role?: string;
      subscriptionEndsAt?: string | null;
    } | undefined,
  );

  const fetchMetaAccounts = useCallback(() => {
    fetch("/api/social/meta/accounts")
      .then((r) => r.json())
      .then((data: MetaAccountsResponse) => setMetaAccounts(data))
      .catch(() => setMetaAccounts(null));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchMetaAccounts();
    }, 0);
    return () => clearTimeout(t);
  }, [session, fetchMetaAccounts]);

  const chooseMetaPage = useCallback(
    async (page: MetaPageOption) => {
      if (!site) return;
      setPickingPage(page.id);
      setMetaError(null);
      try {
        const fbRes = await fetch("/api/social/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: "facebook",
            siteDomain: site.domain,
            pageId: page.id,
          }),
        });
        const fbData = await fbRes.json().catch(() => ({}));
        if (!fbRes.ok) {
          throw new Error(
            typeof fbData.error === "string"
              ? fbData.error
              : "Could not connect that Facebook Page",
          );
        }
        if (page.instagram) {
          const igRes = await fetch("/api/social/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: "instagram",
              siteDomain: site.domain,
              pageId: page.id,
            }),
          });
          if (!igRes.ok) {
            const igData = await igRes.json().catch(() => ({}));
            throw new Error(
              typeof igData.error === "string"
                ? igData.error
                : "Page connected. Instagram on that Page could not be linked.",
            );
          }
        }
        await loadSiteSocialConnections();
      } catch (err) {
        setMetaError(err instanceof Error ? err.message : "Could not connect page");
      } finally {
        setPickingPage(null);
      }
    },
    [site, loadSiteSocialConnections],
  );

  const siteConnectionCount = Object.keys(siteSocialConnections).filter(
    (k) =>
      siteSocialConnections[k]?.accessToken || siteSocialConnections[k]?.accountId,
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Facebook & Instagram
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {paid
            ? "Connect Facebook once, then assign a Page to each site — your brand or every client you market for."
            : "Connect Facebook for your one website. Free publishes to that Page and its Instagram. Upgrade to Pro to add client sites and more accounts."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => connectSocial("facebook")}
            className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {metaAccounts?.connected
              ? "Reconnect Facebook"
              : "Connect Facebook"}
          </button>
          {metaAccounts?.connected && (
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              ✓ {metaAccounts.loginName || metaAccounts.email || "Connected"}
              {typeof metaAccounts.pages?.length === "number"
                ? ` · ${metaAccounts.pages.length} Page${metaAccounts.pages.length === 1 ? "" : "s"}`
                : ""}
            </span>
          )}
        </div>
        {metaAccounts?.connected && (metaAccounts.pages ?? []).length === 0 && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            This Facebook login has no Pages. You need to be an admin of a
            Facebook Page (a personal profile is not enough).
          </p>
        )}
        {metaAccounts?.connected && (metaAccounts.pages ?? []).length > 0 && !site && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Load a site below, then choose which Page to publish to.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Publishing for this site
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {paid
            ? "Pick the Page (and other accounts) crawlspark should use for this domain."
            : "Free is built for one brand. Connect Facebook below — X, LinkedIn, and extra client Pages unlock on Pro."}
        </p>

        {site ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <h3 className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {site.domain}
            </h3>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const conn = siteSocialConnections[platform];
                const isConnected =
                  conn?.connected === true ||
                  !!conn?.accessToken ||
                  !!conn?.accountId;
                const locked = !paid && !isFreeSocialPlatform(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => connectSocial(platform)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      isConnected
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                        : locked
                          ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                          : "border-emerald-200 bg-white hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:hover:bg-emerald-950"
                    }`}
                  >
                    {isConnected ? "✓ " : locked ? "Pro · " : ""}
                    Connect {platformLabel(platform)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={async () => {
                  if (!site) return;
                  const email = window.prompt("Recipient email for this site:");
                  if (!email?.trim()) return;
                  try {
                    const res = await fetch("/api/social/link", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        platform: "email",
                        siteDomain: site.domain,
                        recipientEmail: email.trim(),
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed");
                    void loadSiteSocialConnections();
                  } catch (e) {
                    window.alert(
                      e instanceof Error ? e.message : "Failed to set email",
                    );
                  }
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  siteSocialConnections.email?.accountId
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    : "border-emerald-200 bg-white hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900"
                }`}
              >
                {siteSocialConnections.email?.accountId
                  ? `✓ Email: ${siteSocialConnections.email.accountId}`
                  : "Set email recipient"}
              </button>
            </div>

            {!paid && (
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                Want X, LinkedIn, Pinterest, or a different Page per client site?{" "}
                <Link href="/billing" className="font-semibold text-amber-700 underline dark:text-amber-400">
                  Upgrade to Pro
                </Link>
              </p>
            )}

            {metaAccounts?.connected ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-950">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Pages on this Facebook login
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Tap the Page to publish for {site.domain}.
                  {paid
                    ? " Same login, different Page per site."
                    : " Free uses one Page for your one website."}
                </p>
                {(metaAccounts.pages ?? []).length === 0 ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                    No Facebook Pages on this login. Be an admin of a Page, then
                    reconnect.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {(metaAccounts.pages ?? []).map((page) => {
                      const selected =
                        siteSocialConnections.facebook?.accountId === page.id;
                      const igSelected =
                        !!page.instagram &&
                        siteSocialConnections.instagram?.accountId ===
                          page.instagram.id;
                      return (
                        <button
                          key={page.id}
                          type="button"
                          disabled={pickingPage === page.id}
                          onClick={() => void chooseMetaPage(page)}
                          className={`flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs ${
                            selected
                              ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                              : "border-slate-200 hover:border-amber-300 dark:border-slate-700"
                          }`}
                        >
                          <span>
                            <span className="block font-medium text-slate-900 dark:text-slate-100">
                              {selected ? "✓ " : ""}
                              {page.name}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              Facebook Page
                              {page.instagram
                                ? ` · Instagram ${page.instagram.username ? `@${page.instagram.username}` : "linked"}${igSelected ? " ✓" : ""}`
                                : " · no Instagram professional account"}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            {pickingPage === page.id
                              ? "Connecting…"
                              : selected
                                ? "Using"
                                : "Use this"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {metaError && (
                  <p className="mt-2 text-xs text-rose-600">{metaError}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                After you connect Facebook and approve access, Pages appear here
                so you can pick one.
              </p>
            )}
            <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400">
              {siteConnectionCount} account{siteConnectionCount === 1 ? "" : "s"}{" "}
              connected for this site.
            </p>
          </div>
        ) : savedSites.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Tap your site, then connect Facebook.
            </p>
            <div className="flex flex-wrap gap-2">
              {savedSites.map((s) => (
                <button
                  key={s.domain}
                  type="button"
                  onClick={() => void loadSavedSite(s.domain)}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  {s.domain.replace(/^https?:\/\//, "")}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Crawl your website on the dashboard first, then connect Facebook here.
          </p>
        )}

        {(quotaExceeded || error) && (
          <p className="mt-3 text-sm text-rose-600">
            {error}{" "}
            {quotaExceeded && (
              <Link href="/billing" className="font-semibold underline">
                Open Billing
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
