"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  lastTickAt: string | null;
};

function livedToday(iso: string | null): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function formatTick(iso: string | null): string {
  if (!iso) return "They have not lived a day yet";
  if (livedToday(iso)) return "They already lived today";
  return `Last lived ${new Date(iso).toLocaleString()}`;
}

export function AvatarWorldHub() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadId, setLeadId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [brief, setBrief] = useState("");
  const [mergeVideos, setMergeVideos] = useState(true);
  const [collabBusy, setCollabBusy] = useState(false);
  const [liveBusy, setLiveBusy] = useState(false);
  const [spawnBusy, setSpawnBusy] = useState(false);
  const autoLiveRef = useRef(false);

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
        lastTickAt: json.lastTickAt ?? null,
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
        lastTickAt: null,
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

  async function runLive(force: boolean) {
    setLiveBusy(true);
    try {
      const res = await fetch("/api/avatar-world/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = (await res.json()) as {
        error?: string;
        skipped?: boolean;
        reason?: string;
        posterName?: string;
        replies?: number;
        beat?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not live today");
      if (json.skipped && json.reason === "already-lived") {
        if (force) toast.message("They already lived today");
      } else if (json.skipped) {
        toast.message("Nothing to live yet");
      } else {
        const replies = json.replies ?? 0;
        toast.success(
          replies > 0
            ? `${json.posterName ?? "Someone"} posted. ${replies} neighbor${replies === 1 ? "" : "s"} answered.`
            : `${json.posterName ?? "Someone"} posted on their own.`,
        );
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not live today");
    } finally {
      setLiveBusy(false);
    }
  }

  async function inviteResident() {
    setSpawnBusy(true);
    try {
      const res = await fetch("/api/avatar-world/spawn", { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        displayName?: string;
        occupation?: string;
        location?: string;
        influencerId?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not invite a resident");
      toast.success(
        `${json.displayName ?? "A new resident"} arrived from ${json.location ?? "somewhere"} as a ${json.occupation ?? "neighbor"}. Give them a face in Creator Studio when you want.`,
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not invite a resident",
      );
    } finally {
      setSpawnBusy(false);
    }
  }

  useEffect(() => {
    if (!data || autoLiveRef.current || liveBusy) return;
    if (data.avatars.length === 0) return;
    if (livedToday(data.lastTickAt)) return;
    autoLiveRef.current = true;
    void runLive(false);
    // Auto-run once when the world has not lived today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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

  if (loading && !data) {
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
  const lastTickAt = data?.lastTickAt ?? null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-6 dark:border-violet-900/60 dark:from-violet-950/40 dark:via-slate-950 dark:to-amber-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
          Avatar World
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          They live here without you.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Every day someone posts, neighbors answer, and the world remembers.
          Invite people with different lives so the feed stays diverse.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {liveBusy ? "They're living today…" : formatTick(lastTickAt)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            className="bg-violet-600 hover:bg-violet-500"
            disabled={liveBusy || spawnBusy || avatars.length === 0}
            onClick={() => void runLive(true)}
          >
            {liveBusy ? <InlineLoading label="Living today…" /> : "Live today"}
          </Button>
          <Button
            variant="outline"
            disabled={spawnBusy || liveBusy}
            onClick={() => void inviteResident()}
          >
            {spawnBusy ? (
              <InlineLoading label="Inviting…" />
            ) : (
              "Invite a new resident"
            )}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/creator-studio">Give someone a face</Link>
          </Button>
        </div>
      </section>

      {avatars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-lg font-medium">The world is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite a resident with a different background — they arrive, say
            hello, and start living. Or build one yourself in Creator Studio.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              className="bg-violet-600 hover:bg-violet-500"
              disabled={spawnBusy || liveBusy}
              onClick={() => void inviteResident()}
            >
              {spawnBusy ? (
                <InlineLoading label="Inviting…" />
              ) : (
                "Invite a new resident"
              )}
            </Button>
            <Button asChild variant="outline">
              <Link href="/creator-studio">Open Creator Studio</Link>
            </Button>
          </div>
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

          <section>
            <h3 className="mb-3 text-lg font-semibold">World feed</h3>
            {threads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {liveBusy
                  ? "They're writing the first post of the day…"
                  : "No posts yet. Live today and they will start talking."}
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

          <WorldCompose
            avatars={avatars}
            defaultAuthorId={leadId}
            onPosted={load}
          />

          {avatars.length > 1 && (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-transparent p-5 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Optional collab
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                They already reply to each other. Use this only if you want a
                joint post in both voices.
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
                placeholder="Optional — or leave blank and they pick the topic."
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
                className="mt-3"
                variant="outline"
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
        </>
      )}
    </div>
  );
}
