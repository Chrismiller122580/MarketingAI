"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type InfluencerRow = {
  id: string;
  displayName: string;
  handle: string;
  updatedAt: string;
  assets?: { portraitUrl?: string } | null;
  productFacts?: { name: string } | null;
};

export function InfluencersPanel() {
  const [influencers, setInfluencers] = useState<InfluencerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/creator-studio/influencers")
      .then((r) => r.json())
      .then((data: { influencers?: InfluencerRow[] }) => {
        setInfluencers(data.influencers ?? []);
      })
      .catch(() => setInfluencers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading influencers…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">ViraForge Influencers</h2>
            <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400">
              {influencers.length} active
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI personas that learn from your inputs and locked product facts.
          </p>
        </div>
        <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-500">
          <Link href="/creator-studio">+ New influencer</Link>
        </Button>
      </div>

      {influencers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No influencers yet. Open Creator Studio to build your first persona.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {influencers.map((inf) => (
            <li
              key={inf.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {inf.displayName}{" "}
                  <span className="text-muted-foreground">@{inf.handle}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {inf.productFacts?.name ?? "No product linked"} · Updated{" "}
                  {new Date(inf.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/creator-studio?influencer=${inf.id}`}>Edit</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}