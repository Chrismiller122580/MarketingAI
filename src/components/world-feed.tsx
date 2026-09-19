"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading } from "./loading-indicator";
import type {
  ContributorSuggestion,
  WorldInfluencerCard,
  WorldPostCard,
  WorldThread,
} from "@/lib/viraforge/avatar-world";

export function AvatarFace({
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

export function WorldCompose({
  avatars,
  defaultAuthorId,
  onPosted,
}: {
  avatars: WorldInfluencerCard[];
  defaultAuthorId?: string;
  onPosted: () => Promise<void> | void;
}) {
  const [authorId, setAuthorId] = useState(
    defaultAuthorId || avatars[0]?.id || "",
  );
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  async function postToWorld() {
    if (!authorId) {
      toast.error("Pick who is posting");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/avatar-world/${authorId}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          save: true,
          platform: "instagram",
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not post");
      toast.success("Posted to the world");
      setPrompt("");
      await onPosted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post");
    } finally {
      setBusy(false);
    }
  }

  if (avatars.length === 0) return null;

  return (
    <section className="rounded-2xl border border-violet-200 bg-card p-5 dark:border-violet-900/60">
      <h3 className="text-lg font-semibold">Post to the world</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        They write in their own voice from mood, lore, and what neighbors have
        already said.
      </p>
      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Who is speaking</span>
        <select
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        >
          {avatars.map((avatar) => (
            <option key={avatar.id} value={avatar.id}>
              {avatar.displayName} (@{avatar.handle}) — {avatar.mood}
            </option>
          ))}
        </select>
      </label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="What’s happening — a launch, a feeling, a scene in the city…"
        className="mt-3 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <Button
        className="mt-3 bg-violet-600 hover:bg-violet-500"
        disabled={busy}
        onClick={() => void postToWorld()}
      >
        {busy ? <InlineLoading label="Writing…" /> : "Create and post"}
      </Button>
    </section>
  );
}

function PostBody({ post }: { post: WorldPostCard }) {
  return (
    <>
      <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
        {post.text}
      </p>
      {post.worldBeat && (
        <p className="mt-2 text-xs italic text-violet-700 dark:text-violet-300">
          World: {post.worldBeat}
        </p>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">
        {new Date(post.createdAt).toLocaleString()}
        {post.platform ? ` · ${post.platform}` : ""}
      </p>
    </>
  );
}

export function WorldThreadCard({
  thread,
  avatars,
  suggestions = [],
  onContributed,
}: {
  thread: WorldThread;
  avatars: WorldInfluencerCard[];
  suggestions?: ContributorSuggestion[];
  onContributed: () => Promise<void> | void;
}) {
  const partners = avatars.filter((avatar) => avatar.id !== thread.influencerId);
  const suggestedId = suggestions[0]?.influencerId;
  const [contributorId, setContributorId] = useState(
    suggestedId || partners[0]?.id || "",
  );
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function contribute(auto = false) {
    if (!auto && !contributorId) {
      toast.error("Pick who adds their voice");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/avatar-world/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: thread.id,
          contributorId: auto ? undefined : contributorId,
          brief: brief.trim() || undefined,
          auto,
        }),
      });
      const json = (await res.json()) as { error?: string; worldBeat?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not add to this post");
      toast.success(json.worldBeat || "They added to the story");
      setBrief("");
      setOpen(false);
      await onContributed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Contribute failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <AvatarFace
          name={thread.displayName}
          portraitUrl={thread.portraitUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Link
              href={`/avatar-world/${thread.influencerId}`}
              className="font-medium hover:underline"
            >
              {thread.displayName}
            </Link>{" "}
            <span className="text-muted-foreground">@{thread.handle}</span>
          </p>
          <div className="mt-1">
            <PostBody post={thread} />
          </div>
        </div>
      </div>

      {thread.replies.length > 0 && (
        <ol className="mt-3 space-y-3 border-l-2 border-violet-200 pl-4 dark:border-violet-900">
          {thread.replies.map((reply) => (
            <li key={reply.id} className="flex gap-3">
              <AvatarFace
                name={reply.displayName}
                portraitUrl={reply.portraitUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link
                    href={`/avatar-world/${reply.influencerId}`}
                    className="font-medium hover:underline"
                  >
                    {reply.displayName}
                  </Link>{" "}
                  <span className="text-muted-foreground">
                    built on this · @{reply.handle}
                  </span>
                </p>
                <PostBody post={reply} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {partners.length > 0 && (
        <div className="mt-3">
          {!open ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
              >
                Add another voice
              </Button>
              {suggestions[0] && (
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-500"
                  disabled={busy}
                  onClick={() => void contribute(true)}
                >
                  {busy ? (
                    <InlineLoading label="Writing…" />
                  ) : (
                    `Let ${suggestions[0].displayName} reply`
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-muted/50 p-3">
              {suggestions[0] && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Suggested: {suggestions[0].displayName} — {suggestions[0].reason}
                </p>
              )}
              <select
                value={contributorId}
                onChange={(e) => setContributorId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {partners.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.displayName} (@{avatar.handle}) — {avatar.mood}
                  </option>
                ))}
              </select>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Optional direction — challenge them, continue the scene, bring a secret…"
                className="mt-2 min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-500"
                  disabled={busy}
                  onClick={() => void contribute(false)}
                >
                  {busy ? (
                    <InlineLoading label="Writing…" />
                  ) : (
                    "Add their voice"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
