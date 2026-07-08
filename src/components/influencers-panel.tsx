"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading, LoadingSkeleton } from "./loading-indicator";

type InfluencerRow = {
  id: string;
  displayName: string;
  handle: string;
  updatedAt: string;
  assets?: { portraitUrl?: string; videoUrl?: string } | null;
  productFacts?: { name: string } | null;
};

function InfluencerSkeleton() {
  return (
    <li className="flex items-center gap-4 rounded-lg border border-border p-3">
      <LoadingSkeleton className="h-20 w-16 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <LoadingSkeleton className="h-4 w-40" />
        <LoadingSkeleton className="h-3 w-56" />
      </div>
      <LoadingSkeleton className="h-8 w-14 shrink-0 rounded-md" />
    </li>
  );
}

export function InfluencersPanel() {
  const [influencers, setInfluencers] = useState<InfluencerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadInfluencers = useCallback(() => {
    setLoading(true);
    fetch("/api/creator-studio/influencers")
      .then((r) => r.json())
      .then((data: { influencers?: InfluencerRow[] }) => {
        setInfluencers(data.influencers ?? []);
      })
      .catch(() => setInfluencers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInfluencers();
  }, [loadInfluencers]);

  async function handleDelete(inf: InfluencerRow) {
    if (
      !window.confirm(
        `Delete ${inf.displayName} (@${inf.handle})? This removes the avatar, renders, and saved facts. Posts linked to this avatar will be kept.`,
      )
    ) {
      return;
    }

    setDeletingId(inf.id);
    try {
      const res = await fetch(`/api/creator-studio/influencers/${inf.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string; displayName?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");

      setInfluencers((rows) => rows.filter((row) => row.id !== inf.id));
      toast.success(`${data.displayName ?? inf.displayName} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete avatar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              ViraForge Influencers
            </h2>
            {!loading && (
              <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400">
                {influencers.length} active
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI personas that learn from your inputs and locked product facts.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-violet-600 hover:bg-violet-500"
          disabled={loading}
        >
          <Link href="/creator-studio">+ New influencer</Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading influencers">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <InlineLoading label="Loading influencers…" />
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            <InfluencerSkeleton />
            <InfluencerSkeleton />
          </ul>
        </div>
      ) : influencers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No influencers yet. Open Creator Studio to build your first persona.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {influencers.map((inf) => (
            <li
              key={inf.id}
              className="flex items-center gap-4 rounded-lg border border-border p-3"
            >
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {inf.assets?.videoUrl ? (
                  <video
                    src={inf.assets.videoUrl}
                    muted
                    playsInline
                    className="h-full w-full object-cover object-top"
                  />
                ) : inf.assets?.portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inf.assets.portraitUrl}
                    alt={`Portrait of ${inf.displayName}`}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User className="h-6 w-6 opacity-40" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {inf.displayName}{" "}
                  <span className="text-muted-foreground">@{inf.handle}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {inf.productFacts?.name ?? "No product linked"} · Updated{" "}
                  {new Date(inf.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/creator-studio?influencer=${inf.id}`}>Edit</Link>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === inf.id}
                  aria-label={`Delete ${inf.displayName}`}
                  onClick={() => void handleDelete(inf)}
                >
                  {deletingId === inf.id ? (
                    <InlineLoading label="Deleting…" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}