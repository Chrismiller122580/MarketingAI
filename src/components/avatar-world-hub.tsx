"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading, LoadingSkeleton } from "./loading-indicator";
import {
  AvatarFace,
  WorldChatCard,
  WorldCompose,
  WorldThreadCard,
} from "./world-feed";
import type {
  ContributorSuggestion,
  WorldChatCard as WorldChat,
  WorldInfluencerCard,
  WorldLifeEvent,
  WorldThread,
} from "@/lib/viraforge/avatar-world";

type WorldEconomySnapshot = {
  currencyLabel: string;
  treasury: number;
  jobTitles: string[];
  townReady: boolean;
  missingTownJobs: string[];
  accounts: Array<{
    influencerId: string;
    displayName: string;
    occupation: string;
    balance: number;
    wage: number;
    rent: number;
    employer: string;
  }>;
  listings: Array<{
    id: string;
    sellerName: string;
    title: string;
    body: string;
    kind: string;
    price: number;
    status: string;
    buyerName?: string;
  }>;
  places: Array<{
    id: string;
    name: string;
    kind: string;
    keeperName?: string;
    keeperOccupation?: string;
    note: string;
  }>;
};

type HubData = {
  avatars: WorldInfluencerCard[];
  feed: WorldLifeEvent[];
  threads: WorldThread[];
  lore: string[];
  suggestions: Record<string, ContributorSuggestion[]>;
  lastTickAt: string | null;
  chats: WorldChat[];
  economy: WorldEconomySnapshot | null;
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
  const [foundBusy, setFoundBusy] = useState(false);
  const [publicBusyId, setPublicBusyId] = useState<string | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickJob, setQuickJob] = useState("");
  const [quickCity, setQuickCity] = useState("");
  const [quickVibe, setQuickVibe] = useState("");
  const [quickCount, setQuickCount] = useState(1);
  const [quickFace, setQuickFace] = useState(true);
  const [faceBusyId, setFaceBusyId] = useState<string | null>(null);
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
        chats: json.chats ?? [],
        economy: json.economy ?? null,
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
        chats: [],
        economy: null,
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
          event.eventType !== "world_contribute" &&
          event.eventType !== "world_chat" &&
          event.eventType !== "world_hangout" &&
          event.eventType !== "world_tick",
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
        chats?: number;
        hangout?: { place: string; names: string[] };
        beat?: string;
        growth?: string[];
      };
      if (!res.ok) throw new Error(json.error ?? "Could not live today");
      if (json.skipped && json.reason === "already-lived") {
        if (force) toast.message("They already lived today");
      } else if (json.skipped) {
        toast.message("Nothing to live yet");
      } else {
        const replies = json.replies ?? 0;
        const chats = json.chats ?? 0;
        toast.success(
          json.beat ||
            `${json.posterName ?? "Someone"} posted${
              replies > 0 ? `, ${replies} neighbor${replies === 1 ? "" : "s"} answered` : ""
            }${chats > 0 ? `, ${chats} conversation${chats === 1 ? "" : "s"} happened` : ""}.`,
        );
        if (json.growth && json.growth.length > 0) {
          toast.message(json.growth[0]);
        }
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not live today");
    } finally {
      setLiveBusy(false);
    }
  }

  async function inviteResident(body: Record<string, unknown> = {}) {
    const founding = body.foundTown === true;
    if (founding) setFoundBusy(true);
    else setSpawnBusy(true);
    try {
      const res = await fetch("/api/avatar-world/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        error?: string;
        displayName?: string;
        occupation?: string;
        location?: string;
        count?: number;
        remaining?: number;
        created?: Array<{
          displayName: string;
          occupation: string;
          location: string;
          portraitUrl?: string;
        }>;
        introReplyName?: string;
        chatBeat?: string;
        foundTown?: boolean;
        alreadyFounded?: boolean;
        listings?: number;
        portraitUrl?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not invite a resident");
      const count = json.count ?? json.created?.length ?? 1;
      if (json.foundTown) {
        if (json.alreadyFounded) {
          toast.message("The town is already standing");
        } else if ((json.count ?? 0) === 0) {
          toast.message("No room to found more of the town");
        } else {
          toast.success(
            `Town opened: ${json.created?.map((row) => row.displayName).join(", ")}. They have jobs, rent, and a shop.`,
          );
        }
      } else if (count > 1) {
        const faced =
          json.created?.filter((row) => Boolean(row.portraitUrl)).length ?? 0;
        toast.success(
          `Arrived: ${json.created?.map((row) => row.displayName).join(", ")}. ${
            faced > 0 ? `${faced} with a face. ` : ""
          }${json.remaining ?? 0} slots left.`,
        );
      } else {
        const hello = json.introReplyName
          ? `${json.displayName ?? "A new resident"} arrived from ${json.location ?? "somewhere"} as a ${json.occupation ?? "neighbor"} and said hello. ${json.introReplyName} answered.`
          : `${json.displayName ?? "A new resident"} arrived from ${json.location ?? "somewhere"} as a ${json.occupation ?? "neighbor"} and said hello.`;
        const withFace = json.portraitUrl ? " They arrived with a face." : "";
        toast.success(
          json.chatBeat ? `${hello} ${json.chatBeat}${withFace}` : `${hello}${withFace}`,
        );
      }
      setQuickName("");
      setQuickJob("");
      setQuickCity("");
      setQuickVibe("");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not invite a resident",
      );
    } finally {
      setSpawnBusy(false);
      setFoundBusy(false);
    }
  }

  async function togglePublicUse(avatarId: string, next: boolean) {
    setPublicBusyId(avatarId);
    try {
      const res = await fetch(`/api/avatar-world/${avatarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not update access");
      toast.success(
        next
          ? "Public can use this avatar"
          : "This avatar is admin-only again",
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update access",
      );
    } finally {
      setPublicBusyId(null);
    }
  }

  async function paintFace(avatarId: string) {
    setFaceBusyId(avatarId);
    try {
      const res = await fetch(`/api/avatar-world/${avatarId}/portrait`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string; portraitUrl?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not paint a face");
      toast.success("They have a face now");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not paint a face");
    } finally {
      setFaceBusyId(null);
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
  const chats = data?.chats ?? [];

  return (
    <div className="min-w-0 space-y-8 overflow-x-hidden">
      <section className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-6 dark:border-violet-900/60 dark:from-violet-950/40 dark:via-slate-950 dark:to-amber-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
          Avatar World
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          They live here without you.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Found a town and they go to work. They get paid in Sparks, pay rent,
          buy groceries, make friends, and hang out at the lake, the park, the
          bar, and the rec hall. When you pick one for a post, that life is in
          their voice. This world is admin-only. Allow the ones the public can
          use.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {liveBusy ? "They're living today…" : formatTick(lastTickAt)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!(data?.economy?.townReady) && (
            <Button
              className="bg-violet-600 hover:bg-violet-500"
              disabled={spawnBusy || liveBusy || foundBusy}
              onClick={() => void inviteResident({ foundTown: true })}
            >
              {foundBusy || spawnBusy ? (
                <InlineLoading label="Founding the town…" />
              ) : avatars.length === 0 ? (
                "Found a town"
              ) : (
                "Stock the town"
              )}
            </Button>
          )}
          <Button
            className={
              data?.economy?.townReady
                ? "bg-violet-600 hover:bg-violet-500"
                : ""
            }
            variant={data?.economy?.townReady ? "default" : "outline"}
            disabled={spawnBusy || liveBusy || foundBusy}
            onClick={() => void inviteResident()}
          >
            {spawnBusy && !foundBusy ? (
              <InlineLoading label="Inviting…" />
            ) : (
              "Surprise me"
            )}
          </Button>
          <Button
            variant="outline"
            disabled={liveBusy || spawnBusy || foundBusy || avatars.length === 0}
            onClick={() => void runLive(true)}
          >
            {liveBusy ? <InlineLoading label="Living today…" /> : "Live today"}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/world">Public town</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/creator-studio">Give someone a face</Link>
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">Quick create</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill none, one, or a few. The rest of their life is invented — including
          a face, if you want one. Batch up to 5.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Name (optional)
            </span>
            <input
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Leave blank"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Job (optional)
            </span>
            <input
              value={quickJob}
              onChange={(e) => setQuickJob(e.target.value)}
              list="world-jobs"
              placeholder="baker, pilot, poet…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
            <datalist id="world-jobs">
              {(data?.economy?.jobTitles ?? []).map((job) => (
                <option key={job} value={job} />
              ))}
            </datalist>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              City (optional)
            </span>
            <input
              value={quickCity}
              onChange={(e) => setQuickCity(e.target.value)}
              placeholder="Accra, Kyoto…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              How many
            </span>
            <select
              value={quickCount}
              onChange={(e) => setQuickCount(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value={1}>1 person</option>
              <option value={3}>3 people</option>
              <option value={5}>5 people</option>
            </select>
          </label>
        </div>
        <textarea
          value={quickVibe}
          onChange={(e) => setQuickVibe(e.target.value)}
          placeholder="Optional vibe — quiet, messy, devout, night-shift energy…"
          className="mt-3 min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={quickFace}
            onChange={(e) => setQuickFace(e.target.checked)}
            className="mt-1 shrink-0"
          />
          <span className="min-w-0">
            <span className="block font-medium">Create a face</span>
            <span className="block text-xs text-muted-foreground">
              {quickCount > 1
                ? `Paints all ${quickCount}. Takes a little longer.`
                : "Skip the studio — they arrive with a portrait."}
            </span>
          </span>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            className="bg-violet-600 hover:bg-violet-500"
            disabled={spawnBusy || liveBusy || foundBusy}
            onClick={() =>
              void inviteResident({
                name: quickName.trim() || undefined,
                occupation: quickJob.trim() || undefined,
                location: quickCity.trim() || undefined,
                vibe: quickVibe.trim() || undefined,
                count: quickCount,
                welcome: quickCount === 1,
                withFace: quickFace,
              })
            }
          >
            {spawnBusy ? (
              <InlineLoading
                label={quickFace ? "Painting a face…" : "Creating…"}
              />
            ) : quickCount > 1 ? (
              `Create ${quickCount} residents`
            ) : quickFace ? (
              "Create this person + face"
            ) : (
              "Create this person"
            )}
          </Button>
          <Button
            variant="outline"
            disabled={spawnBusy || liveBusy || foundBusy}
            onClick={() =>
              void inviteResident({ count: 1, welcome: true, withFace: quickFace })
            }
          >
            Surprise me
          </Button>
        </div>
      </section>

      {avatars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-lg font-medium">The world is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Found a town and eight people arrive with jobs — baker, grocer,
            landlord, teller, nurse, mechanic, bus driver, poet. They pay rent,
            buy food, and live a day without you.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              className="bg-violet-600 hover:bg-violet-500"
              disabled={spawnBusy || liveBusy || foundBusy}
              onClick={() => void inviteResident({ foundTown: true })}
            >
              {foundBusy || spawnBusy ? (
                <InlineLoading label="Founding the town…" />
              ) : (
                "Found a town"
              )}
            </Button>
            <Button
              variant="outline"
              disabled={spawnBusy || liveBusy || foundBusy}
              onClick={() => void inviteResident()}
            >
              Surprise me
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

          {data?.economy && (
            <>
              {(data.economy.places ?? []).length > 0 && (
                <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {data.economy.places.map((place) => {
                    const lastChat = chats.find(
                      (chat) =>
                        chat.placeId === place.id ||
                        chat.placeName === place.name,
                    );
                    return (
                    <div
                      key={place.id}
                      className={`min-w-0 rounded-2xl border p-4 ${
                        place.kind === "lake"
                          ? "border-sky-200 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/20"
                          : place.kind === "park"
                            ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                            : place.kind === "bar"
                              ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
                              : place.kind === "games"
                                ? "border-fuchsia-200 bg-fuchsia-50/70 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/20"
                                : "border-border bg-card"
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {place.name}
                        {place.kind === "lake" ||
                        place.kind === "park" ||
                        place.kind === "bar" ||
                        place.kind === "games"
                          ? " · hangout"
                          : ""}
                      </p>
                      <p className="mt-2 truncate text-sm font-medium">
                        {place.keeperName
                          ? `${place.keeperName}${
                              place.keeperOccupation
                                ? ` · ${place.keeperOccupation}`
                                : ""
                            }`
                          : "Unattended"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {lastChat?.beat || place.note}
                      </p>
                      {lastChat?.beat && (
                        <p className="mt-2 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                          Last night
                        </p>
                      )}
                    </div>
                    );
                  })}
                </section>
              )}
              <section className="grid min-w-0 gap-4 lg:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  City Bank
                </h3>
                <p className="mt-2 break-words text-3xl font-semibold tabular-nums">
                  {data.economy.treasury.toLocaleString()} {data.economy.currencyLabel}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pays wages. Collects rent when nobody holds the keys.
                  Residents spend Sparks on food and each other.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {data.economy.accounts.slice(0, 8).map((row) => (
                    <li
                      key={row.influencerId}
                      className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                    >
                      <span className="min-w-0 truncate">
                        {row.displayName}
                        <span className="text-muted-foreground">
                          {" "}
                          · {row.occupation || row.employer}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground sm:text-sm sm:text-foreground">
                        {row.balance} · {row.wage}/day
                        {row.rent > 0 ? ` · rent ${row.rent}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0 rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Market
                </h3>
                {data.economy.listings.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nothing for sale yet. Found a town or live a day and someone
                    will list a loaf, a room, a ride.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {data.economy.listings.slice(0, 8).map((row) => (
                      <li key={row.id} className="border-b border-border pb-3 last:border-0">
                        <p className="text-sm font-medium">
                          {row.title}{" "}
                          <span className="text-muted-foreground">
                            · {row.price} Sparks
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.sellerName} · {row.kind}
                          {row.status === "sold"
                            ? ` · bought by ${row.buyerName ?? "a neighbor"}`
                            : " · open"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                          {row.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
            </>
          )}

          <section className="min-w-0">
            <div className="mb-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              <h3 className="text-lg font-semibold">Residents</h3>
              <p className="min-w-0 text-xs text-muted-foreground">
                {avatars.length} living ·{" "}
                {avatars.filter((row) => row.isPublic).length} public
                {data?.economy?.townReady
                  ? " · town is standing"
                  : data?.economy?.missingTownJobs?.length
                    ? ` · missing ${data.economy.missingTownJobs.slice(0, 3).join(", ")}`
                    : ""}
              </p>
            </div>
            <ul className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {avatars.map((avatar) => (
                <li
                  key={avatar.id}
                  className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card transition hover:border-violet-300 hover:shadow-sm dark:hover:border-violet-700"
                >
                  <Link
                    href={`/avatar-world/${avatar.id}`}
                    className="flex min-w-0 flex-1 items-start gap-3 p-4"
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
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            avatar.isPublic
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {avatar.isPublic ? "Public can use" : "Admin only"}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          {avatar.balance} Sparks
                        </span>
                        {avatar.wage > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {avatar.wage}/day
                          </span>
                        )}
                        {avatar.rent > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            rent {avatar.rent}
                          </span>
                        )}
                        {avatar.street && (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                            {avatar.street}
                          </span>
                        )}
                        {avatar.partnerName && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                            with {avatar.partnerName}
                          </span>
                        )}
                        {!avatar.partnerName &&
                          avatar.familyNames.length > 0 && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                              family
                            </span>
                          )}
                      </div>
                    </div>
                  </Link>
                  <div className="grid min-w-0 gap-2 border-t border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {avatar.isPublic
                        ? "Listed for the public"
                        : "Hidden from the public"}
                    </p>
                    <div
                      className={`grid w-full min-w-0 gap-1.5 ${
                        avatar.portraitUrl ? "grid-cols-1" : "grid-cols-2"
                      }`}
                    >
                      {!avatar.portraitUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-w-0 w-full"
                          disabled={
                            faceBusyId === avatar.id ||
                            liveBusy ||
                            spawnBusy ||
                            foundBusy
                          }
                          onClick={() => void paintFace(avatar.id)}
                        >
                          {faceBusyId === avatar.id ? (
                            <InlineLoading label="Painting…" />
                          ) : (
                            "Give a face"
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={avatar.isPublic ? "outline" : "default"}
                        className={
                          avatar.isPublic
                            ? "min-w-0 w-full"
                            : "min-w-0 w-full bg-violet-600 hover:bg-violet-500"
                        }
                        disabled={
                          publicBusyId === avatar.id ||
                          liveBusy ||
                          spawnBusy ||
                          foundBusy ||
                          faceBusyId !== null
                        }
                        onClick={() =>
                          void togglePublicUse(avatar.id, !avatar.isPublic)
                        }
                      >
                        {publicBusyId === avatar.id ? (
                          <InlineLoading label="Saving…" />
                        ) : avatar.isPublic ? (
                          "Make private"
                        ) : (
                          "Allow public"
                        )}
                      </Button>
                    </div>
                  </div>
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
                  : "No posts yet. They'll start talking on their own."}
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

          {chats.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-semibold">Where they ran into each other</h3>
              <div className="space-y-4">
                {chats.map((chat) => (
                  <WorldChatCard key={chat.conversationId} chat={chat} />
                ))}
              </div>
            </section>
          )}

          {lifeFeed.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-semibold">Life around them</h3>
              <ol className="space-y-3">
                {lifeFeed.slice(0, 12).map((event) => (
                  <li
                    key={event.id}
                    className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-3"
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

          <details className="rounded-2xl border border-dashed border-slate-300 bg-transparent p-5 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold text-slate-600 dark:text-slate-300">
              Director tools (optional — they don't need you)
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Daily posts and neighbor chats happen without a brief. Use these
              only if you want to hand someone a scene.
            </p>
            <div className="mt-4 space-y-5">
              <WorldCompose
                avatars={avatars}
                defaultAuthorId={leadId}
                onPosted={load}
              />

              {avatars.length > 1 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Joint note
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    They already talk. This writes one shared note in two voices.
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
                    placeholder="Optional scene — or leave blank and they pick the topic."
                    className="mt-3 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={mergeVideos}
                      onChange={(e) => setMergeVideos(e.target.checked)}
                    />
                    Merge their latest videos into the note
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
                      "Create a joint note"
                    )}
                  </Button>
                </section>
              )}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
