"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading, LoadingSkeleton } from "./loading-indicator";
import type {
  AvatarWorldProfile as WorldProfile,
  WorldInfluencerCard,
  WorldLifeEvent,
  WorldPostCard,
} from "@/lib/viraforge/avatar-world";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { InfluencerAssets } from "@/lib/viraforge/influencer-assets";
import type { InfluencerRenderRecord } from "@/lib/viraforge/influencer-renders";

type Detail = {
  id: string;
  displayName: string;
  handle: string;
  persona: CreatorAvatarForm;
  world: WorldProfile;
  assets: InfluencerAssets;
  events: WorldLifeEvent[];
  renders: InfluencerRenderRecord[];
  posts: WorldPostCard[];
  others: WorldInfluencerCard[];
};

type Tab = "profile" | "vault" | "life" | "create" | "together";

const MOODS = [
  "inspired",
  "focused",
  "playful",
  "homesick",
  "ambitious",
  "grateful",
  "restless",
  "calm",
];

function ChipInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800 dark:bg-violet-950 dark:text-violet-200"
            onClick={() => onChange(values.filter((item) => item !== value))}
          >
            {value} ×
          </button>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const next = draft.trim();
            if (next && !values.includes(next)) onChange([...values, next]);
            setDraft("");
          }
        }}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

export function AvatarWorldProfile({ influencerId }: { influencerId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<WorldProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventBody, setEventBody] = useState("");
  const [eventKind, setEventKind] = useState("everyday");
  const [eventMood, setEventMood] = useState("inspired");
  const [savingEvent, setSavingEvent] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [learning, setLearning] = useState(false);
  const [collabBrief, setCollabBrief] = useState("");
  const [collabBusy, setCollabBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/avatar-world/${influencerId}`);
      const json = (await res.json()) as Detail & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Avatar not found");
      setDetail(json);
      setForm(json.world);
      setTeacherId((prev) => prev || json.others[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [influencerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const videos = useMemo(
    () =>
      (detail?.renders ?? []).filter(
        (row) =>
          (row.type === "motion" || row.type === "merged") &&
          row.status === "ready" &&
          row.url,
      ),
    [detail],
  );

  function patchForm(partial: Partial<WorldProfile>) {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  async function saveProfile() {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/avatar-world/${influencerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { world?: WorldProfile; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      if (json.world) setForm(json.world);
      toast.success("Profile updated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function createContent() {
    setCreating(true);
    try {
      const res = await fetch(`/api/avatar-world/${influencerId}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, save: true, platform: "instagram" }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not write");
      setDraft(json.text ?? "");
      toast.success("Saved to their posts");
      setPrompt("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Write failed");
    } finally {
      setCreating(false);
    }
  }

  async function addEvent() {
    if (!eventTitle.trim() || !eventBody.trim()) {
      toast.error("Add a title and what happened");
      return;
    }
    setSavingEvent(true);
    try {
      const res = await fetch(`/api/avatar-world/${influencerId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventTitle,
          body: eventBody,
          kind: eventKind,
          mood: eventMood,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save event");
      setEventTitle("");
      setEventBody("");
      toast.success("Life event added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Event failed");
    } finally {
      setSavingEvent(false);
    }
  }

  async function mergeSelected() {
    if (selectedClips.length < 2) {
      toast.error("Select at least two clips");
      return;
    }
    setMerging(true);
    try {
      const res = await fetch("/api/avatar-world/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerId, renderIds: selectedClips }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Merge failed");
      toast.success("Longer reel saved to their vault");
      setSelectedClips([]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Merge failed");
    } finally {
      setMerging(false);
    }
  }

  async function learn() {
    if (!teacherId) {
      toast.error("Pick someone to learn from");
      return;
    }
    setLearning(true);
    try {
      const res = await fetch(`/api/avatar-world/${influencerId}/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromInfluencerId: teacherId }),
      });
      const json = (await res.json()) as { lesson?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Learn failed");
      toast.success(json.lesson ?? "They learned something");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Learn failed");
    } finally {
      setLearning(false);
    }
  }

  async function collab() {
    if (!teacherId) {
      toast.error("Pick a partner");
      return;
    }
    setCollabBusy(true);
    try {
      const res = await fetch("/api/avatar-world/collab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: influencerId,
          partnerId: teacherId,
          brief: collabBrief,
          mergeVideos: true,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Collab failed");
      toast.success("Collab post saved");
      setCollabBrief("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Collab failed");
    } finally {
      setCollabBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-40 w-full rounded-2xl" />
        <LoadingSkeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!detail || !form) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <p>That avatar is not in your world.</p>
        <Button asChild className="mt-3">
          <Link href="/avatar-world">Back to Avatar World</Link>
        </Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "vault", label: `Vault (${videos.length})` },
    { id: "life", label: "Life" },
    { id: "create", label: "Create" },
    { id: "together", label: "Together" },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative h-36 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-400">
          {detail.assets.portraitUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.assets.portraitUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top opacity-30"
            />
          )}
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <div className="-mt-12 h-24 w-20 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-md">
            {detail.assets.videoUrl ? (
              <video
                src={detail.assets.videoUrl}
                muted
                playsInline
                autoPlay
                loop
                className="h-full w-full object-cover object-top"
              />
            ) : detail.assets.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.assets.portraitUrl}
                alt={detail.displayName}
                className="h-full w-full object-cover object-top"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{detail.displayName}</h2>
            <p className="text-sm text-muted-foreground">
              @{detail.handle} · {form.currentCity || detail.persona.location}
            </p>
            <p className="mt-1 text-sm">{form.bio}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {form.mood}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/world/${detail.id}`} target="_blank">
                Public profile
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/creator-studio?influencer=${detail.id}`}>
                Studio
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === item.id
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 lg:grid-cols-2">
          <label className="text-sm lg:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Bio</span>
            <textarea
              value={form.bio}
              onChange={(e) => patchForm({ bio: e.target.value })}
              className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm lg:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">
              Backstory
            </span>
            <textarea
              value={form.backstory}
              onChange={(e) => patchForm({ backstory: e.target.value })}
              className="min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Occupation
            </span>
            <input
              value={form.occupation}
              onChange={(e) => patchForm({ occupation: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Relationship
            </span>
            <input
              value={form.relationshipStatus}
              onChange={(e) =>
                patchForm({ relationshipStatus: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Hometown
            </span>
            <input
              value={form.hometown}
              onChange={(e) => patchForm({ hometown: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Lives in
            </span>
            <input
              value={form.currentCity}
              onChange={(e) => patchForm({ currentCity: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Mood</span>
            <select
              value={form.mood}
              onChange={(e) => patchForm({ mood: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              {MOODS.map((mood) => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              What they're sitting with
            </span>
            <input
              value={form.moodNote}
              onChange={(e) => patchForm({ moodNote: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm lg:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">
              Catchphrase
            </span>
            <input
              value={form.catchphrase}
              onChange={(e) => patchForm({ catchphrase: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <ChipInput
            label="Values"
            values={form.values}
            onChange={(values) => patchForm({ values })}
            placeholder="Add a value and press Enter"
          />
          <ChipInput
            label="Goals"
            values={form.goals}
            onChange={(goals) => patchForm({ goals })}
            placeholder="Add a goal and press Enter"
          />
          <ChipInput
            label="Interests"
            values={form.interests}
            onChange={(interests) => patchForm({ interests })}
            placeholder="Add an interest and press Enter"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => patchForm({ isPublic: e.target.checked })}
            />
            Public on the web
          </label>
          <div className="lg:col-span-2">
            <Button
              className="bg-violet-600 hover:bg-violet-500"
              disabled={saving}
              onClick={() => void saveProfile()}
            >
              {saving ? <InlineLoading label="Saving…" /> : "Save profile"}
            </Button>
          </div>
          {form.learnedNotes.length > 0 && (
            <div className="lg:col-span-2 rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What they've learned
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {form.learnedNotes.map((note) => (
                  <li key={note}>“{note}”</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab === "vault" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Every portrait, talk clip, and merged reel stays here. Select 2–6
              videos to stitch a longer post.
            </p>
            <Button
              disabled={merging || selectedClips.length < 2}
              onClick={() => void mergeSelected()}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {merging ? (
                <InlineLoading label="Merging…" />
              ) : (
                `Merge ${selectedClips.length || ""} clips`
              )}
            </Button>
          </div>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No videos yet. Generate motion in Creator Studio — they all land
              here automatically.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {videos.map((clip) => {
                const selected = selectedClips.includes(clip.id);
                return (
                  <li
                    key={clip.id}
                    className={`overflow-hidden rounded-2xl border ${
                      selected
                        ? "border-violet-500 ring-2 ring-violet-300"
                        : "border-border"
                    }`}
                  >
                    <video
                      src={clip.url ?? undefined}
                      controls
                      playsInline
                      className="aspect-[9/16] w-full bg-black object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {clip.type === "merged"
                            ? "Merged reel"
                            : clip.motionType ?? "Motion"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(clip.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() =>
                          setSelectedClips((prev) =>
                            selected
                              ? prev.filter((id) => id !== clip.id)
                              : [...prev, clip.id].slice(0, 6),
                          )
                        }
                      >
                        {selected ? "Selected" : "Select"}
                      </Button>
                    </div>
                    {clip.script && (
                      <p className="line-clamp-3 px-3 pb-3 text-xs text-muted-foreground">
                        {clip.script}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === "life" && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ol className="space-y-3">
            {detail.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Their first day is about to be written.
              </p>
            ) : (
              detail.events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {event.body}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()} · {event.kind}
                    {event.mood ? ` · ${event.mood}` : ""}
                  </p>
                </li>
              ))
            )}
          </ol>
          <form
            className="space-y-3 rounded-2xl border border-border bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void addEvent();
            }}
          >
            <p className="font-medium">Something happened</p>
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={eventBody}
              onChange={(e) => setEventBody(e.target.value)}
              placeholder="What changed for them?"
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              value={eventKind}
              onChange={(e) => setEventKind(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="everyday">Everyday</option>
              <option value="milestone">Milestone</option>
              <option value="mood">Mood</option>
              <option value="travel">Travel</option>
              <option value="create">Created something</option>
              <option value="lesson">Lesson</option>
            </select>
            <select
              value={eventMood}
              onChange={(e) => setEventMood(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {MOODS.map((mood) => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500"
              disabled={savingEvent}
            >
              {savingEvent ? (
                <InlineLoading label="Saving…" />
              ) : (
                "Add life event"
              )}
            </Button>
          </form>
        </section>
      )}

      {tab === "create" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <p className="font-medium">Write from their backstory</p>
            <p className="text-sm text-muted-foreground">
              They draft in their own voice using mood, life events, and what
              they've learned from other avatars.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask them to talk about this week, a launch, or how they feel in this city…"
              className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <Button
              className="bg-violet-600 hover:bg-violet-500"
              disabled={creating}
              onClick={() => void createContent()}
            >
              {creating ? (
                <InlineLoading label="Writing…" />
              ) : (
                "Create and save post"
              )}
            </Button>
            {draft && (
              <pre className="whitespace-pre-wrap rounded-xl bg-muted/60 p-4 text-sm">
                {draft}
              </pre>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Their recent posts</p>
            {detail.posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing published from this life yet.
              </p>
            ) : (
              detail.posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-xl border border-border bg-card p-4 text-sm"
                >
                  <p className="whitespace-pre-wrap">{post.text}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {post.platform} ·{" "}
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {tab === "together" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <p className="font-medium">Learn from another avatar</p>
            <p className="text-sm text-muted-foreground">
              They watch someone else's life and keep a lesson. It changes
              how they write next time.
            </p>
            {detail.others.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a second avatar so they have someone to learn from.
              </p>
            ) : (
              <>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {detail.others.map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.displayName} (@{other.handle}) — {other.mood}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  disabled={learning}
                  onClick={() => void learn()}
                >
                  {learning ? (
                    <InlineLoading label="Learning…" />
                  ) : (
                    "Learn from them"
                  )}
                </Button>
                <textarea
                  value={collabBrief}
                  onChange={(e) => setCollabBrief(e.target.value)}
                  placeholder="Or write a collab brief…"
                  className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <Button
                  className="bg-violet-600 hover:bg-violet-500"
                  disabled={collabBusy}
                  onClick={() => void collab()}
                >
                  {collabBusy ? (
                    <InlineLoading label="Collaborating…" />
                  ) : (
                    "Write a collab post"
                  )}
                </Button>
              </>
            )}
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Relationships</p>
            {form.relationships.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bonds yet. Learning and collabs create them.
              </p>
            ) : (
              <ul className="space-y-2">
                {form.relationships.map((rel) => (
                  <li
                    key={rel.influencerId}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
                  >
                    <Link
                      href={`/avatar-world/${rel.influencerId}`}
                      className="font-medium hover:underline"
                    >
                      {rel.displayName}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      @{rel.handle} · {rel.kind}
                    </span>
                    {rel.note && (
                      <p className="mt-1 text-muted-foreground">{rel.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
