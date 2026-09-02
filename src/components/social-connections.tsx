"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";
import type { IntegrationGuide } from "@/lib/integrations";
import type { SocialConnectionStatus } from "@/lib/types";

type StatusResponse = {
  connections: SocialConnectionStatus[];
  connectedCount: number;
  aiImageAvailable: boolean;
  aiVideoAvailable: boolean;
  aiVoiceAvailable: boolean;
  aiCopyAvailable: boolean;
  aiCopyProvider: "openai" | "xai" | null;
  aiImageProvider: "openai" | "xai" | null;
  aiVideoProvider: "replicate" | null;
  aiVoiceProvider: "elevenlabs" | null;
  twitterOAuthEnabled?: boolean;
  twitterBearerOnly?: boolean;
  guides: IntegrationGuide[];
};

function providerLabel(provider: "openai" | "xai" | null) {
  if (provider === "openai") return "OpenAI";
  if (provider === "xai") return "xAI (Grok)";
  return "Not configured";
}

function GuideCard({ guide, connected }: { guide: IntegrationGuide; connected: boolean }) {
  const [open, setOpen] = useState(!connected);

  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              connected ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
            }`}
          />
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {guide.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {guide.envVars.join(" · ")}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 text-xs font-medium ${
            connected ? "text-emerald-600" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {connected ? "Active" : "Not active"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-300">{guide.summary}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-600 dark:text-slate-300">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {guide.docsUrl && (
            <a
              href={guide.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              Official docs →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

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

export function SocialConnections() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [metaAccounts, setMetaAccounts] = useState<MetaAccountsResponse | null>(
    null,
  );
  const [pickingPage, setPickingPage] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const { data: session } = useSession();
  const { site, savedSites, loadSavedSite, siteSocialConnections, connectSocial, loadSiteSocialConnections } = useSite();
  const isAdmin = session?.user?.role === "admin";

  const fetchStatus = useCallback(() => {
    setLoading(true);
    fetch("/api/social/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  const fetchMetaAccounts = useCallback(() => {
    fetch("/api/social/meta/accounts")
      .then((r) => r.json())
      .then((data: MetaAccountsResponse) => setMetaAccounts(data))
      .catch(() => setMetaAccounts(null));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchStatus();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchStatus]);

  useEffect(() => {
    if (!site) {
      setMetaAccounts(null);
      return;
    }
    const t = setTimeout(() => {
      void fetchMetaAccounts();
    }, 0);
    return () => clearTimeout(t);
  }, [site, session, fetchMetaAccounts]);

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

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Checking connections…</p>
      </div>
    );
  }

  const socialGuides =
    status?.guides.filter((g) => g.category === "social") ?? [];
  const aiGuides = status?.guides.filter((g) => g.category === "ai") ?? [];

  const socialConnected = (platform: string) =>
    status?.connections.find((c) => c.platform === platform)?.connected ?? false;

  const siteConnectionCount = Object.keys(siteSocialConnections).filter(
    (k) => siteSocialConnections[k]?.accessToken || siteSocialConnections[k]?.accountId,
  ).length;

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Integrations overview
            </h2>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="text-xs text-amber-600 hover:underline disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh status"}
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Server-side API keys (Vercel env vars). End users connect their own accounts below.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {status?.connectedCount ?? 0}/{status?.connections.length ?? 5}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Global social</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {status?.aiCopyAvailable ? "✓" : "—"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI copy</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {status?.aiImageAvailable ? "✓" : "—"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI images</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {status?.aiVideoAvailable ? "✓" : "—"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI video</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {status?.aiVoiceAvailable ? "✓" : "—"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI voice</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {status?.aiCopyProvider ? providerLabel(status.aiCopyProvider) : "—"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Copy provider</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Your publishing accounts
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Connect social accounts per site below. crawlspark.ai publishes using your authorized tokens — not shared app keys.
          </p>
          {site ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {(["twitter", "linkedin", "facebook", "instagram", "pinterest", "email"] as const).map(
                (platform) => {
                  const conn = siteSocialConnections[platform];
                  const connected =
                    conn?.connected === true ||
                    !!conn?.accessToken ||
                    !!conn?.accountId;
                  const label =
                    platform === "twitter"
                      ? "X"
                      : platform === "facebook"
                        ? "Facebook / Meta"
                        : platform.charAt(0).toUpperCase() + platform.slice(1);
                  return (
                    <span
                      key={platform}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        connected
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {connected ? "✓ " : ""}
                      {label}
                      {platform === "email" && conn?.accountId
                        ? `: ${conn.accountId}`
                        : ""}
                    </span>
                  );
                },
              )}
            </div>
          ) : savedSites.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Choose a crawled site to connect Facebook, Instagram, and the rest.
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
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
              Crawl a site on the dashboard first, then connect Meta for that domain.
            </p>
          )}
          {site && (
            <p className="mt-3 text-xs text-slate-500">
              {siteConnectionCount} account{siteConnectionCount === 1 ? "" : "s"} connected for{" "}
              {site.domain}
            </p>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              AI setup
            </h2>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="text-xs text-amber-600 hover:underline disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh status"}
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Set API keys as needed — copy: {providerLabel(status?.aiCopyProvider ?? null)},
            images: {providerLabel(status?.aiImageProvider ?? null)},
            video: {status?.aiVideoAvailable ? "Replicate" : "Not configured"},
            voice: {status?.aiVoiceAvailable ? "ElevenLabs" : "Not configured"}
          </p>
          <div className="mt-4 space-y-2">
            {aiGuides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                connected={
                  guide.id === "openai"
                    ? status?.aiCopyProvider === "openai" ||
                      status?.aiImageProvider === "openai"
                    : guide.id === "replicate"
                      ? !!status?.aiVideoAvailable
                      : guide.id === "elevenlabs"
                        ? !!status?.aiVoiceAvailable
                        : guide.id === "instagram"
                        ? !!status?.connections?.find((c) => c.platform === "instagram")?.connected
                        : status?.aiCopyProvider === "xai" ||
                          status?.aiImageProvider === "xai"
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Social publishing
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isAdmin
            ? "Global env-var fallbacks are for app-level defaults. Users connect per-site accounts below via OAuth."
            : "Authorize your social accounts for each crawled site. Tokens are stored privately for that domain only."}
        </p>

        {/* Per-user / per-site OAuth connect for regular users */}
        {site ? (
          <div className="mt-4 p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900">
            <h3 className="font-semibold text-sm mb-2 text-emerald-800 dark:text-emerald-200">
              Connect accounts for this site: {site.domain}
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-3">
              Connect the Facebook Page and Instagram account you post with.
              This is for publishing, not Meta Ads Manager.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["twitter", "linkedin", "facebook", "instagram", "pinterest"] as const).map((platform) => {
                const conn = siteSocialConnections[platform];
                const isConnected =
                  conn?.connected === true ||
                  !!conn?.accessToken ||
                  !!conn?.accountId;
                const label =
                  platform === "twitter"
                    ? "X"
                    : platform === "facebook"
                      ? "Facebook / Meta"
                      : platform.charAt(0).toUpperCase() + platform.slice(1);
                return (
                  <button
                    key={platform}
                    onClick={() => connectSocial(platform)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                      isConnected
                        ? "bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                        : "bg-white border-emerald-200 hover:bg-emerald-50 dark:bg-slate-900 dark:border-emerald-800 dark:hover:bg-emerald-950"
                    }`}
                  >
                    {isConnected ? "✓ " : ""}Connect {label}
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
                    loadSiteSocialConnections();
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : "Failed to set email");
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                  siteSocialConnections.email?.accountId
                    ? "bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    : "bg-white border-emerald-200 hover:bg-emerald-50 dark:bg-slate-900 dark:border-emerald-800 dark:hover:bg-emerald-950"
                }`}
              >
                {siteSocialConnections.email?.accountId
                  ? `✓ Email: ${siteSocialConnections.email.accountId}`
                  : "Set email recipient"}
              </button>
            </div>
            {metaAccounts?.connected ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-950">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Facebook / Meta accounts on this login
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {metaAccounts.loginName || metaAccounts.email
                    ? `Logged into Meta as ${[metaAccounts.loginName, metaAccounts.email].filter(Boolean).join(" · ")}.`
                    : "Pages this Meta login can manage."}{" "}
                  Tap the Page you want crawlspark to publish to for {site.domain}.
                </p>
                {(metaAccounts.pages ?? []).length === 0 ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                    No Facebook Pages on this login. A personal profile is not enough — you need to be admin of a Page (and an Instagram professional account linked to it).
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
                After you tap Connect Facebook / Meta and approve access, crawlspark will list the Pages on that email here so you can pick one.
              </p>
            )}
            <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400">
              After connecting, posts for this site will use your accounts.
            </p>
          </div>
        ) : savedSites.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Tap your site, then connect Facebook / Meta.
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
            Crawl your site on the dashboard first, then connect Meta here.
          </p>
        )}

        {/* Detailed global setup — admin only */}
        {isAdmin && (
          <div className="mt-4 space-y-2">
            {status?.twitterBearerOnly && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300">
                X/Twitter global: using app-only Bearer Token only (posting disabled for global fallback; per-site OAuth or TWITTER_ACCESS_TOKEN recommended for writes).
              </div>
            )}
            {socialGuides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                connected={socialConnected(guide.id)}
              />
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Vercel quick checklist
          </h3>
          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm text-amber-800 dark:text-amber-300/90">
            <li>Open Vercel → your project → Settings → Environment Variables</li>
            <li>Add each variable below for Production (and Preview if needed)</li>
            <li>Deployments → ⋯ → Redeploy (env vars only apply to new deploys)</li>
            <li>Return here and refresh — see live Active / Not active status below</li>
          </ol>

          {/* Dynamically wired live status tile for global env connections */}
          <div className="mt-4 rounded-lg border border-amber-200/70 bg-white/70 p-3 text-xs dark:border-amber-900/60 dark:bg-slate-950/50">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Live global status
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              {/* AI providers */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">OPENAI_API_KEY</span>
                <span className={(status?.aiCopyAvailable || status?.aiImageAvailable) ? "font-medium text-emerald-600" : "text-slate-400 dark:text-slate-500"}>
                  {(status?.aiCopyAvailable || status?.aiImageAvailable) ? "Active" : "Not active"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">XAI_API_KEY</span>
                <span className={(status?.aiCopyProvider === "xai" || status?.aiImageProvider === "xai") ? "font-medium text-emerald-600" : "text-slate-400 dark:text-slate-500"}>
                  {(status?.aiCopyProvider === "xai" || status?.aiImageProvider === "xai") ? "Active" : "Not active"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">REPLICATE_API_TOKEN</span>
                <span className={status?.aiVideoAvailable ? "font-medium text-emerald-600" : "text-slate-400 dark:text-slate-500"}>
                  {status?.aiVideoAvailable ? "Active" : "Not active"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">ELEVENLABS_API_KEY</span>
                <span className={status?.aiVoiceAvailable ? "font-medium text-emerald-600" : "text-slate-400 dark:text-slate-500"}>
                  {status?.aiVoiceAvailable ? "Active" : "Not active"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">INSTAGRAM_CLIENT_ID</span>
                <span className={status?.connections?.find((c) => c.platform === "instagram")?.connected ? "font-medium text-emerald-600" : "text-slate-400 dark:text-slate-500"}>
                  {status?.connections?.find((c) => c.platform === "instagram")?.connected ? "Active" : "Not active"}
                </span>
              </div>

              {/* Social — uses the live connections data (already handles bearer-only labels) */}
              {status?.connections?.map((c) => (
                <div key={c.platform} className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">{c.label}</span>
                  <span className={c.connected ? "font-medium text-emerald-600" : "text-slate-400 dark:text-slate-500"}>
                    {c.connected ? "Active" : "Not active"}
                  </span>
                </div>
              ))}
            </div>
            {status?.twitterBearerOnly && (
              <div className="mt-2 rounded bg-amber-100/70 px-2 py-1 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Twitter global is Active via bearer token only (app-only = limited posting). Prefer per-site “Connect with X” or set TWITTER_ACCESS_TOKEN.
              </div>
            )}
          </div>

          <div className="mt-3 text-[10px] font-medium text-amber-700 dark:text-amber-400/90">Template to paste (var names only):</div>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-white/80 p-3 text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
{`OPENAI_API_KEY=
XAI_API_KEY=

TWITTER_ACCESS_TOKEN=   # best for global direct posts
TWITTER_BEARER_TOKEN=   # limited fallback

LINKEDIN_ACCESS_TOKEN=
LINKEDIN_AUTHOR_URN=

FACEBOOK_PAGE_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_LOGIN_CONFIG_ID=

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_ACCOUNT_ID=

PINTEREST_ACCESS_TOKEN=
PINTEREST_BOARD_ID=`}
          </pre>
        </div>
      )}
    </div>
  );
}