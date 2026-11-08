"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { WorldChatCard } from "@/lib/viraforge/avatar-world";

type AvatarOption = {
  id: string;
  displayName: string;
  handle: string;
  portraitUrl?: string;
};

export function AvatarChat() {
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [topic, setTopic] = useState("");
  const [chats, setChats] = useState<WorldChatCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [people, history] = await Promise.all([
        fetch("/api/creator-studio/influencers").then((res) => res.json()),
        fetch("/api/avatars/chat").then((res) => res.json()),
      ]);
      const options = (
        (people.influencers ?? []) as Array<{
          id: string;
          displayName: string;
          handle: string;
          assets?: { portraitUrl?: string };
        }>
      ).map((row) => ({
        id: row.id,
        displayName: row.displayName,
        handle: row.handle,
        portraitUrl: row.assets?.portraitUrl,
      }));
      setAvatars(options);
      setAId(options[0]?.id ?? "");
      setBId(options[1]?.id ?? options[0]?.id ?? "");
      setChats((history.chats ?? []) as WorldChatCard[]);
    })().catch(() => {
      setError("Could not load your avatars.");
    });
  }, []);

  async function startChat() {
    if (!aId || !bId || aId === bId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/avatars/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aId, bId, topic }),
      });
      const raw = await res.text();
      let data: { error?: string; chat?: WorldChatCard } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        throw new Error("The chat did not come back. Try again.");
      }
      if (!res.ok || !data.chat) {
        throw new Error(data.error ?? "Could not start the chat");
      }
      setChats((current) => [data.chat!, ...current.filter((chat) => chat.conversationId !== data.chat!.conversationId)]);
      setTopic("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the chat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Conversation
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Let two avatars talk
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          They speak in their own voices. This is not a post and not a video.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {avatars.length < 2 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Save at least two avatars first. Then they can talk.
          </p>
        ) : (
          <>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              First avatar
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={aId}
                onChange={(event) => setAId(event.target.value)}
              >
                {avatars.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.displayName} (@{avatar.handle})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              Second avatar
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={bId}
                onChange={(event) => setBId(event.target.value)}
              >
                {avatars.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.displayName} (@{avatar.handle})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              What are they talking about?
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={topic}
                maxLength={280}
                placeholder="Optional. Leave blank and they talk about their day."
                onChange={(event) => setTopic(event.target.value)}
              />
            </label>
            <Button
              type="button"
              className="w-full bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900"
              disabled={busy || aId === bId}
              onClick={() => void startChat()}
            >
              {busy ? "They're talking…" : "Let them talk"}
            </Button>
          </>
        )}
        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-300" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {chats.map((chat) => (
          <article
            key={chat.conversationId}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs text-slate-500">{chat.beat}</p>
            <ol className="mt-3 space-y-3">
              {chat.turns.map((turn, index) => (
                <li key={`${chat.conversationId}-${index}`} className="flex gap-3">
                  {turn.portraitUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={turn.portraitUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold dark:bg-slate-800">
                      {turn.displayName.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {turn.displayName}{" "}
                      <span className="font-normal text-slate-500">@{turn.handle}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                      {turn.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  );
}
