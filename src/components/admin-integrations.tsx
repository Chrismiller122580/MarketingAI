"use client";

import { useCallback, useEffect, useState } from "react";
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
  twitterBearerOnly?: boolean;
  guides: IntegrationGuide[];
};

function providerLabel(provider: "openai" | "xai" | null) {
  if (provider === "openai") return "OpenAI";
  if (provider === "xai") return "xAI (Grok)";
  return "Not configured";
}

function GuideCard({
  guide,
  connected,
}: {
  guide: IntegrationGuide;
  connected: boolean;
}) {
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
        </div>
      )}
    </div>
  );
}

export function AdminIntegrations() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(() => {
    setLoading(true);
    fetch("/api/social/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const socialGuides = status?.guides.filter((g) => g.category === "social") ?? [];
  const aiGuides = status?.guides.filter((g) => g.category === "ai") ?? [];
  const socialConnected = (platform: string) =>
    status?.connections.find((c) => c.platform === platform)?.connected ?? false;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Backend API & connections
          </h2>
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="text-xs text-amber-600 hover:underline disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh status"}
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Admin only. Server keys from environment variables. Members never see this.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {status?.connectedCount ?? 0}/{status?.connections.length ?? 5}
            </p>
            <p className="text-xs text-slate-500">Global social</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
            <p className="text-2xl font-bold">{status?.aiCopyAvailable ? "✓" : "—"}</p>
            <p className="text-xs text-slate-500">AI copy</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
            <p className="text-2xl font-bold">{status?.aiImageAvailable ? "✓" : "—"}</p>
            <p className="text-xs text-slate-500">AI images</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
            <p className="text-2xl font-bold">{status?.aiVideoAvailable ? "✓" : "—"}</p>
            <p className="text-xs text-slate-500">AI video</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-950">
            <p className="text-2xl font-bold">{status?.aiVoiceAvailable ? "✓" : "—"}</p>
            <p className="text-xs text-slate-500">AI voice</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          AI setup
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Copy: {providerLabel(status?.aiCopyProvider ?? null)}, images:{" "}
          {providerLabel(status?.aiImageProvider ?? null)}, video:{" "}
          {status?.aiVideoAvailable ? "Replicate" : "Not configured"}, voice:{" "}
          {status?.aiVoiceAvailable ? "ElevenLabs" : "Not configured"}
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
                      : status?.aiCopyProvider === "xai" ||
                        status?.aiImageProvider === "xai"
              }
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Global social fallbacks
        </h2>
        {status?.twitterBearerOnly && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            X/Twitter global is bearer-only. Per-site OAuth or TWITTER_ACCESS_TOKEN
            is needed for writes.
          </div>
        )}
        <div className="mt-4 space-y-2">
          {socialGuides.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              connected={socialConnected(guide.id)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Vercel checklist
        </h3>
        <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm text-amber-800 dark:text-amber-300/90">
          <li>Vercel → project → Settings → Environment Variables</li>
          <li>Add each variable for Production (and Preview if needed)</li>
          <li>Deployments → Redeploy so new vars apply</li>
          <li>Refresh this page for live Active / Not active</li>
        </ol>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-white/80 p-3 text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
{`OPENAI_API_KEY=
XAI_API_KEY=
REPLICATE_API_TOKEN=
ELEVENLABS_API_KEY=

TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_LOGIN_CONFIG_ID=
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
PINTEREST_CLIENT_ID=
PINTEREST_CLIENT_SECRET=`}
        </pre>
      </div>
    </div>
  );
}
