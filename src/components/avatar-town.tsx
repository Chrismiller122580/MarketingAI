"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { WorldChatCard } from "@/lib/viraforge/avatar-world";

type TownState = {
  lore: string[];
  chats: WorldChatCard[];
  lastDay: string | null;
  lastBeat: string;
};

export function AvatarTown() {
  const [town, setTown] = useState<TownState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/avatars/town");
    const data = (await res.json()) as TownState;
    setTown({
      lore: data.lore ?? [],
      chats: data.chats ?? [],
      lastDay: data.lastDay ?? null,
      lastBeat: data.lastBeat ?? "",
    });
  }

  useEffect(() => {
    void load().catch(() => setNote("Could not load the town."));
  }, []);

  async function liveToday() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/avatars/town", { method: "POST" });
      const raw = await res.text();
      let data: {
        error?: string;
        day?: { skipped?: boolean; reason?: string; beat?: string; chats?: number };
      } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        throw new Error("The day took too long and was stopped. Try again later.");
      }
      if (!res.ok) throw new Error(data.error ?? "The day did not finish");
      if (data.day?.skipped && data.day.reason === "already-lived") {
        setNote("They already lived today.");
      } else if (data.day?.skipped && data.day.reason === "empty") {
        setNote("Save an avatar first. The town needs someone to live it.");
      } else {
        setNote(data.day?.beat || "The day happened.");
      }
      await load();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "The day did not finish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Town
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Where they live
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          One day: a post, a reply, and a conversation. That day is what they say in public next.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Button
          type="button"
          className="w-full bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900"
          disabled={busy}
          onClick={() => void liveToday()}
        >
          {busy ? "Living the day…" : "Live today"}
        </Button>
        {town?.lastDay && (
          <p className="mt-2 text-xs text-slate-500">
            Last day {new Date(town.lastDay).toLocaleString()}
          </p>
        )}
        {(note || town?.lastBeat) && (
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {note || town?.lastBeat}
          </p>
        )}
        <p className="mt-3 text-sm">
          <Link href="/chat" className="font-medium text-amber-700 hover:underline dark:text-amber-400">
            Or start one conversation
          </Link>
        </p>
      </div>

      {town && town.lore.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">What they remember</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {town.lore.slice(0, 6).map((beat) => (
              <li key={beat}>{beat}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {(town?.chats ?? []).map((chat) => (
          <article
            key={chat.conversationId}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs text-slate-500">{chat.beat}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-800 dark:text-slate-100">
              {chat.turns.slice(0, 4).map((turn, index) => (
                <li key={`${chat.conversationId}-${index}`}>
                  <span className="font-medium">{turn.displayName}: </span>
                  {turn.text}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
