"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading, LoadingSkeleton } from "./loading-indicator";
import type {
  WorldInfluencerCard,
  WorldLifeEvent,
  WorldPostCard,
} from "@/lib/viraforge/avatar-world";

type HubData = {
  avatars: WorldInfluencerCard[];
  feed: WorldLifeEvent[];
  posts: WorldPostCard[];
};

function AvatarFace({
  name,
  portraitUrl,
  videoUrl,
  size = "md",
}: {
  name: string;
  portraitUrl?: string;
  videoUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg" ? "h-20 w-16" : size === "sm" ? "h-10 w-10" : "h-16 w-14";
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/20 to-amber-400/20 ${box}`}
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          muted
          playsInline
          autoPlay
          loop
          className="h-full w-full object-cover object-top"
        />
      ) : portraitUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={portraitUrl}
          alt={name}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-violet-600">
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}

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
        posts: json.posts ?? [],
      });
      setLeadId((prev) => prev || json.avatars?.[0]?.id || "");
      setPartnerId((prev) => {
        if (prev) return prev;
        return json.avatars?.[1]?.id || "";
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "World unavailable");
      setData({ avatars: [], feed: [], posts: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const timeline = useMemo(() => {
    if (!data) return [];
    const items: Array<
      | { kind: "event"; at: string; event: WorldLifeEvent }
      | { kind: "post"; at: string; post: WorldPostCard }
    > = [
      ...data.feed.map((event) => ({
        kind: "event" as const,
        at: event.createdAt,
        event,
      })),
      ...data.posts.map((post) => ({
        kind: "post" as const,
        at: post.createdAt,
        post,
      })),
    ];
    return items.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 28);
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

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-6 dark:border-violet-900/60 dark:from-violet-950/40 dark:via-slate-950 dark:to-amber-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
          Avatar World
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          They live here now. Profiles, reels, life events, and posts they write
          from their own backstory.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Open a profile to edit who they are. Save every clip. Ask them to
          write. Merge videos into longer posts. Let them learn from each other.
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
            with a public profile and a first life event.
          </p>
          <Button asChild className="mt-4 bg-violet-600 hover:bg-violet-500">
            <Link href="/creator-studio">Open Creator Studio</Link>
          </Button>
        </div>
      ) : (
        <>
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
              <h3 className="text-lg font-semibold">Work together</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Two avatars write one post in both of their voices. Optionally
                stitch their latest clips into a longer reel.
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
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No life yet. Open a profile and let them write, live, or learn.
              </p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((item) =>
                  item.kind === "event" ? (
                    <li
                      key={`e-${item.event.id}`}
                      className="flex gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <AvatarFace
                        name={item.event.displayName}
                        portraitUrl={item.event.portraitUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <Link
                            href={`/avatar-world/${item.event.influencerId}`}
                            className="font-medium hover:underline"
                          >
                            {item.event.displayName}
                          </Link>{" "}
                          <span className="text-muted-foreground">
                            {item.event.title}
                          </span>
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                          {item.event.body}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(item.event.createdAt).toLocaleString()}
                          {item.event.mood ? ` · ${item.event.mood}` : ""}
                        </p>
                      </div>
                    </li>
                  ) : (
                    <li
                      key={`p-${item.post.id}`}
                      className="flex gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <AvatarFace
                        name={item.post.displayName}
                        portraitUrl={item.post.portraitUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <Link
                            href={`/avatar-world/${item.post.influencerId}`}
                            className="font-medium hover:underline"
                          >
                            {item.post.displayName}
                          </Link>{" "}
                          <span className="text-muted-foreground">
                            posted to {item.post.platform}
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                          {item.post.text}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(item.post.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ),
                )}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
