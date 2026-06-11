"use client";

import { useEffect, useState } from "react";
import type { SocialConnectionStatus } from "@/lib/types";

type StatusResponse = {
  connections: SocialConnectionStatus[];
  connectedCount: number;
  aiImageAvailable: boolean;
  aiCopyAvailable: boolean;
};

const ENV_GUIDE: Record<string, string[]> = {
  twitter: ["TWITTER_BEARER_TOKEN"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"],
  facebook: ["FACEBOOK_PAGE_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"],
  instagram: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_ACCOUNT_ID"],
  pinterest: ["PINTEREST_ACCESS_TOKEN", "PINTEREST_BOARD_ID"],
};

export function SocialConnections() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/social/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Checking connections…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Social publishing
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {status?.connectedCount ?? 0} of{" "}
          {status?.connections.length ?? 5} platforms connected via API.
          Unconnected platforms use share links.
        </p>

        <div className="mt-4 space-y-3">
          {status?.connections.map((conn) => (
            <div
              key={conn.platform}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    conn.connected ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className="text-sm font-medium text-slate-900">
                  {conn.label}
                </span>
              </div>
              <span
                className={`text-xs font-medium ${
                  conn.connected ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {conn.connected ? "API connected" : "Share link fallback"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">AI features</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-lg font-bold text-slate-900">
              {status?.aiCopyAvailable ? "✓" : "—"}
            </p>
            <p className="text-xs text-slate-500">AI copy (XAI/OpenAI)</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-lg font-bold text-slate-900">
              {status?.aiImageAvailable ? "✓" : "—"}
            </p>
            <p className="text-xs text-slate-500">AI images (DALL-E/Grok)</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-6">
        <h3 className="text-sm font-semibold text-amber-900">
          Connect platforms (Vercel env vars)
        </h3>
        <div className="mt-3 space-y-2 text-xs text-amber-800">
          {Object.entries(ENV_GUIDE).map(([platform, vars]) => (
            <div key={platform}>
              <span className="font-medium capitalize">{platform}:</span>{" "}
              {vars.join(", ")}
            </div>
          ))}
          <p className="mt-2 text-amber-600">
            Also: OPENAI_API_KEY or XAI_API_KEY for AI copy + images
          </p>
        </div>
      </div>
    </div>
  );
}