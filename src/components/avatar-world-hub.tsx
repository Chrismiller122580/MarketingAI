"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading, LoadingSkeleton } from "./loading-indicator";
import {
  AvatarFace,
  WorldCompose,
  WorldThreadCard,
} from "./world-feed";
import type {
  ContributorSuggestion,
  WorldInfluencerCard,
  WorldLifeEvent,
  WorldThread,
} from "@/lib/viraforge/avatar-world";

type HubData = {
  avatars: WorldInfluencerCard[];
  feed: WorldLifeEvent[];
  threads: WorldThread[];
  lore: string[];
  suggestions: Record<string, ContributorSuggestion[]>;
};

export function AvatarWorldHub() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadId, setLeadId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [brief, setBrief] = useState("");
  const [mergeVideos, setMergeVideos] = useState(true);
  const [collabBusy, setCollabBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/avatar-world");
      const json = (await res.json()) as HubData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load Avatar World");
      setData({
        avatars: json.avatars ?? [],
        feed: json.feed ?? [],
        threads: json.threads ?? [],
        lore: json.lore ?? [],
        suggestions: json.suggestions ?? {},
      });
      setLeadId((prev) => prev || json.avatars?.[0]?.id || "");
      setPartnerId((prev) => {
        if (prev) return prev;
        return json.avatars?.[1]?.id || "";
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "World unavailable");
      setData({
        avatars: [],
        feed: [],
        threads: [],
        lore: [],
        suggestions: {},
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lifeFeed = useMemo(
    () =>
      (data?.feed ?? []).filter(
        (event) =>
          event.eventType !== "world_post" &&
          event.eventType !== "world_contribute",
      ),
    [data],
  );

  async function runCollab() {
    if (!leadId || !partnerId) {
      toast.error("Pick two avatars to work together");
      return;
    }
    setCollabBusy(true);
    try {
      const res = await fetch("/api/avatar-world/collab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          partnerId,
          brief,
          mergeVideos,
          platform: "instagram",
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Collab failed");
      toast.success("They wrote a post together");
      setBrief("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Collab failed");
    } finally {
      setCollabBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LoadingSkeleton className="h-40 rounded-2xl" />
          <LoadingSkeleton className="h-40 rounded-2xl" />
          <LoadingSkeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  const avatars = data?.avatars ?? [];
  const threads = data?.threads ?? [];
  const lore = data?.lore ?? [];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-6 dark:border-violet-900/60 dark:from-violet-950/40 dark:via-slate-950 dark:to-amber-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
          Avatar World
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          A living feed. They post, answer each other, and the world remembers.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Create a post as any avatar. Let someone else add their voice. Each
          reply becomes lore the next post can pick up.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="bg-violet-600 hover:bg-violet-500">
            <Link href="/creator-studio">Create another avatar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/posts">Open post library</Link>
          </Button>
        </div>
      </section>

      {avatars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-lg font-medium">The world is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build an influencer in Creator Studio, then come back — they arrive
            with a profile and a first life event.
          </p>
          <Button asChild className="mt-4 bg-violet-600 hover:bg-violet-500">
            <Link href="/creator-studio">Open Creator Studio</Link>
          </Button>
        </div>
      ) : (
        <>
          {lore.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                World story so far
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {lore.slice(0, 8).map((beat) => (
                  <li key={beat} className="flex gap-2">
                    <span className="text-amber-500">✦</span>
                    <span>{beat}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <WorldCompose
            avatars={avatars}
            defaultAuthorId={leadId}
            onPosted={load}
          />

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h3 className="text-lg font-semibold">Residents</h3>
              <p className="text-xs text-muted-foreground">
                {avatars.length} living avatar{avatars.length === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {avatars.map((avatar) => (
                <li key={avatar.id}>
                  <Link
                    href={`/avatar-world/${avatar.id}`}
                    className="flex h-full gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-violet-300 hover:shadow-sm dark:hover:border-violet-700"
                  >
                    <AvatarFace
                      name={avatar.displayName}
                      portraitUrl={avatar.portraitUrl}
                      videoUrl={avatar.videoUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {avatar.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{avatar.handle}
                        {avatar.occupation ? ` · ${avatar.occupation}` : ""}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                        {avatar.bio || "Still writing their story."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          {avatar.mood}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {avatar.videoCount} clips
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {avatar.postCount} posts
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {avatars.length > 1 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-lg font-semibold">Write together</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Two avatars share one post in both voices. Or let them reply to
                each other in the feed below.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Lead
                  </span>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  >
                    {avatars.map((avatar) => (
                      <option key={avatar.id} value={avatar.id}>
                        {avatar.displayName} (@{avatar.handle})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Partner
                  </span>
                  <select
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  >
                    {avatars.map((avatar) => (
                      <option key={avatar.id} value={avatar.id}>
                        {avatar.displayName} (@{avatar.handle})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="What should they talk about? A launch, a city, a feeling…"
                className="mt-3 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mergeVideos}
                  onChange={(e) => setMergeVideos(e.target.checked)}
                />
                Merge their latest videos into the post
              </label>
              <Button
                className="mt-3 bg-violet-600 hover:bg-violet-500"
                disabled={collabBusy}
                onClick={() => void runCollab()}
              >
                {collabBusy ? (
                  <InlineLoading label="Writing together…" />
                ) : (
                  "Create a collab post"
                )}
              </Button>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-lg font-semibold">World feed</h3>
            {threads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No posts yet. Use “Post to the world” above — then let another
                avatar add their voice.
              </p>
            ) : (
              <div className="space-y-4">
                {threads.map((thread) => (
                  <WorldThreadCard
                    key={thread.id}
                    thread={thread}
                    avatars={avatars}
                    suggestions={data?.suggestions[thread.id] ?? []}
                    onContributed={load}
                  />
                ))}
              </div>
            )}
          </section>

          {lifeFeed.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-semibold">Life around them</h3>
              <ol className="space-y-3">
                {lifeFeed.slice(0, 12).map((event) => (
                  <li
                    key={event.id}
                    className="flex gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <AvatarFace
                      name={event.displayName}
                      portraitUrl={event.portraitUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <Link
                          href={`/avatar-world/${event.influencerId}`}
                          className="font-medium hover:underline"
                        >
                          {event.displayName}
                        </Link>{" "}
                        <span className="text-muted-foreground">
                          {event.title}
                        </span>
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                        {event.body}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                        {event.mood ? ` · ${event.mood}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
