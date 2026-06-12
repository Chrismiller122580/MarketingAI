"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";
import type { IntegrationGuide } from "@/lib/integrations";
import type { SocialConnectionStatus } from "@/lib/types";

type StatusResponse = {
  connections: SocialConnectionStatus[];
  connectedCount: number;
  aiImageAvailable: boolean;
  aiCopyAvailable: boolean;
  aiCopyProvider: "openai" | "xai" | null;
  aiImageProvider: "openai" | "xai" | null;
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
          {connected ? "Connected" : "Setup required"}
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

export function SocialConnections() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: session } = useSession();
  const { site, siteSocialConnections, connectSocial, loadSiteSocialConnections } = useSite();
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    fetch("/api/social/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Integrations overview
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add API keys as environment variables in Vercel (or <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.env</code> locally), then redeploy.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {status?.connectedCount ?? 0}/{status?.connections.length ?? 5}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Social APIs</p>
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
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {status?.aiCopyProvider ? providerLabel(status.aiCopyProvider) : "—"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Copy provider</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            AI setup
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Set <strong>one or both</strong> — copy: {providerLabel(status?.aiCopyProvider ?? null)},
            images: {providerLabel(status?.aiImageProvider ?? null)}
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
          Global connections (via env vars) are app-level fallbacks. For per-client (per domain), use the &quot;Social accounts for this site&quot; section in the domain card after loading a site. Clients authorize via standard OAuth — no developer account needed on their side.
        </p>

        {/* Per-user / per-site OAuth connect for regular users */}
        {site ? (
          <div className="mt-4 p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900">
            <h3 className="font-semibold text-sm mb-2 text-emerald-800 dark:text-emerald-200">
              Connect accounts for this site: {site.domain}
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-3">
              Click to log in and grant access. Your tokens are stored privately for this domain only.
            </p>
            <div className="flex flex-wrap gap-2">
              {["twitter", "linkedin", "facebook"].map((platform) => {
                const conn = siteSocialConnections[platform];
                const isConnected = !!conn?.accessToken;
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
                    {isConnected ? "✓ " : ""}Connect with {platform === "twitter" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </button>
                );
              })}
              {/* Instagram and Pinterest can fall back or use extended Facebook flow */}
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 self-center ml-2">Instagram/Pinterest: use Facebook connect or manual in domain card</span>
            </div>
            <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400">
              After connecting, posts for this site will use your accounts.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Load a site first (in the domain card) to connect its social accounts.
          </p>
        )}

        {/* Detailed global setup — admin only */}
        {isAdmin && (
          <div className="mt-4 space-y-2">
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
          <li>Return here and refresh — connected items show green</li>
        </ol>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-white/80 p-4 text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
{`OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...

TWITTER_ACCESS_TOKEN=          # OAuth 2.0 user token (tweet.write)
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_AUTHOR_URN=urn:li:person:...

FACEBOOK_PAGE_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=

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