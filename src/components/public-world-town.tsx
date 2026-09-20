import Link from "next/link";
import type {
  PublicTownResident,
  PublicWorldTown,
  WorldChatCard,
  WorldThread,
} from "@/lib/viraforge/avatar-world";
import type { WorldPlace } from "@/lib/viraforge/world-economy";

export const PUBLIC_PLACE_KINDS = [
  "bank",
  "market",
  "rooms",
  "shop",
  "lake",
  "park",
  "bar",
  "games",
] as const;
export type PublicPlaceKind = (typeof PUBLIC_PLACE_KINDS)[number];

const HANGOUT_KINDS = new Set<PublicPlaceKind>([
  "lake",
  "park",
  "bar",
  "games",
]);

const PLACE_STREET: Partial<Record<PublicPlaceKind, string>> = {
  bank: "Bank Row",
  rooms: "the rooms",
  market: "Market Street",
  shop: "the corner stand",
  lake: "the shoreline",
  park: "the green",
  bar: "last call",
  games: "the rec hall",
};

const PLACE_LABEL: Record<PublicPlaceKind, string> = {
  bank: "City Bank",
  market: "The Market",
  rooms: "Rooms",
  shop: "Corner Shop",
  lake: "The Lake",
  park: "The Park",
  bar: "The Bar",
  games: "The Rec Hall",
};

function isPlaceKind(value: string | undefined): value is PublicPlaceKind {
  return (
    typeof value === "string" &&
    (PUBLIC_PLACE_KINDS as readonly string[]).includes(value)
  );
}

function livedLine(town: PublicWorldTown): string {
  if (town.livedToday) {
    const hang = town.chats.find((chat) => chat.placeName);
    if (hang?.placeName) {
      return `They already lived today. Last seen at ${hang.placeName}.`;
    }
    return "They already lived today — posts, pay, and a walk through town.";
  }
  if (town.lastTickAt) {
    return `Last lived ${new Date(town.lastTickAt).toLocaleString()}.`;
  }
  return "The town is still waking up.";
}

function Face({
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
    size === "lg"
      ? "h-24 w-20"
      : size === "sm"
        ? "h-10 w-10"
        : "h-[4.5rem] w-14";
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl bg-zinc-900 ${box}`}
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
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-violet-300">
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}

function ResidentName({
  id,
  name,
  isPublic,
  className,
}: {
  id: string;
  name: string;
  isPublic?: boolean;
  className?: string;
}) {
  if (isPublic) {
    return (
      <Link href={`/world/${id}`} className={className ?? "font-medium hover:underline"}>
        {name}
      </Link>
    );
  }
  return <span className={className ?? "font-medium"}>{name}</span>;
}

function useHref(id: string) {
  return `/content?influencer=${encodeURIComponent(id)}`;
}

function listingsForPlace(
  place: WorldPlace,
  listings: NonNullable<PublicWorldTown["economy"]>["listings"],
) {
  if (place.kind === "bank") return [];
  if (place.kind === "market") return listings.slice(0, 10);
  if (place.kind === "shop") {
    return listings
      .filter(
        (row) =>
          row.kind === "good" ||
          (place.keeperId && row.sellerId === place.keeperId),
      )
      .slice(0, 8);
  }
  if (HANGOUT_KINDS.has(place.kind as PublicPlaceKind)) {
    return listings
      .filter((row) => place.keeperId && row.sellerId === place.keeperId)
      .slice(0, 6);
  }
  return listings
    .filter(
      (row) =>
        row.kind === "service" ||
        /room|rent|key|loft|bed/i.test(row.title) ||
        (place.keeperId && row.sellerId === place.keeperId),
    )
    .slice(0, 8);
}

function peopleAtPlace(
  place: WorldPlace,
  residents: PublicTownResident[],
  chats: WorldChatCard[] = [],
): PublicTownResident[] {
  const keepers = residents.filter((row) => row.id === place.keeperId);
  const streetMates = residents.filter((row) => {
    if (row.id === place.keeperId) return false;
    if (place.kind === "market" || place.kind === "shop") {
      return row.street === "Market Street" || row.street === "the corner stand";
    }
    const street = PLACE_STREET[place.kind as PublicPlaceKind];
    return street ? row.street === street : false;
  });
  const seen = new Set(keepers.concat(streetMates).map((row) => row.id));
  const visitorIds = new Set(
    chats
      .filter(
        (chat) => chat.placeId === place.id || chat.placeName === place.name,
      )
      .flatMap((chat) => chat.turns.map((turn) => turn.influencerId)),
  );
  const visitors = residents.filter((row) => {
    if (seen.has(row.id) || !visitorIds.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  return [...keepers, ...streetMates, ...visitors];
}

function PublicThread({
  thread,
  publicIds,
}: {
  thread: WorldThread;
  publicIds: Set<string>;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <Face name={thread.displayName} portraitUrl={thread.portraitUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <ResidentName
              id={thread.influencerId}
              name={thread.displayName}
              isPublic={publicIds.has(thread.influencerId)}
            />{" "}
            <span className="text-zinc-500">@{thread.handle}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">
            {thread.text}
          </p>
          {thread.worldBeat && (
            <p className="mt-2 text-xs italic text-amber-100/80">
              {thread.worldBeat}
            </p>
          )}
          <p className="mt-2 text-[11px] text-zinc-500">
            {new Date(thread.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      {thread.replies.length > 0 && (
        <ol className="mt-3 space-y-3 border-l border-white/15 pl-4">
          {thread.replies.map((reply) => (
            <li key={reply.id} className="flex min-w-0 items-start gap-3">
              <Face
                name={reply.displayName}
                portraitUrl={reply.portraitUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <ResidentName
                    id={reply.influencerId}
                    name={reply.displayName}
                    isPublic={publicIds.has(reply.influencerId)}
                  />{" "}
                  <span className="text-zinc-500">answered</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">
                  {reply.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function PublicChat({
  chat,
  publicIds,
}: {
  chat: WorldChatCard;
  publicIds: Set<string>;
}) {
  return (
    <article className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">
        {chat.placeName ? (
          <Link
            href={`/world/place/${
              isPlaceKind(chat.placeId)
                ? chat.placeId
                : (placeKindFromName(chat.placeName) ?? "market")
            }`}
            className="hover:underline"
          >
            At {chat.placeName}
          </Link>
        ) : (
          "Neighbor chat"
        )}
      </p>
      <ol className="mt-3 space-y-3">
        {chat.turns.map((turn, index) => (
          <li
            key={`${chat.id}-${turn.influencerId}-${index}`}
            className="flex min-w-0 items-start gap-3"
          >
            <Face name={turn.displayName} portraitUrl={turn.portraitUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <ResidentName
                  id={turn.influencerId}
                  name={turn.displayName}
                  isPublic={publicIds.has(turn.influencerId)}
                />{" "}
                <span className="text-zinc-500">@{turn.handle}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-100">
                {turn.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {chat.beat && (
        <p className="mt-3 text-xs italic text-violet-200">{chat.beat}</p>
      )}
    </article>
  );
}

function placeKindFromName(name: string): PublicPlaceKind | undefined {
  const lower = name.toLowerCase();
  if (lower.includes("bank")) return "bank";
  if (lower.includes("market")) return "market";
  if (lower.includes("room")) return "rooms";
  if (lower.includes("shop")) return "shop";
  if (lower.includes("lake") || lower.includes("shore") || lower.includes("dock")) {
    return "lake";
  }
  if (lower.includes("park") || lower.includes("green")) return "park";
  if (lower.includes("bar") || lower.includes("last call")) return "bar";
  if (
    lower.includes("rec") ||
    lower.includes("game") ||
    lower.includes("arcade")
  ) {
    return "games";
  }
  return undefined;
}

function ResidentCard({
  resident,
  featured,
}: {
  resident: PublicTownResident;
  featured?: boolean;
}) {
  const inner = (
    <>
      <Face
        name={resident.displayName}
        portraitUrl={resident.portraitUrl}
        videoUrl={resident.videoUrl}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{resident.displayName}</p>
        <p className="truncate text-xs text-zinc-400">
          @{resident.handle}
          {resident.occupation ? ` · ${resident.occupation}` : ""}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-zinc-300">
          {resident.bio || "A resident of Avatar World."}
        </p>
        <p className="mt-2 flex flex-wrap gap-1.5 text-[11px] uppercase tracking-wide text-violet-200">
          <span>{resident.mood}</span>
          {resident.street && <span>· {resident.street}</span>}
          {resident.keepPlace && <span>· keeps {resident.keepPlace}</span>}
          {resident.partnerName && <span>· with {resident.partnerName}</span>}
          {resident.relationshipStatus && !resident.partnerName && (
            <span>· {resident.relationshipStatus}</span>
          )}
        </p>
      </div>
    </>
  );

  return (
    <li className="min-w-0">
      <div className="flex h-full min-w-0 flex-col rounded-3xl border border-white/10 bg-white/5">
        {resident.isPublic ? (
          <Link
            href={`/world/${resident.id}`}
            className="flex min-w-0 flex-1 items-start gap-3 p-4 transition hover:bg-white/10"
          >
            {inner}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-3 p-4">{inner}</div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            {resident.isPublic ? "Public can use" : "Lives in the town"}
          </p>
          {resident.isPublic && (
            <Link
              href={useHref(resident.id)}
              className="rounded-full bg-violet-500 px-3 py-1 text-xs font-medium text-white hover:bg-violet-400"
            >
              {featured ? "Use this avatar" : "Use"}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export function PublicWorldTown({
  town,
  activePlace,
}: {
  town: PublicWorldTown;
  activePlace?: string;
}) {
  const placeKind = isPlaceKind(activePlace) ? activePlace : undefined;
  const places = town.economy?.places ?? [];
  const listings = town.economy?.listings ?? [];
  const publicIds = new Set(town.avatars.map((row) => row.id));
  const hangoutPlaces = new Set(
    town.chats
      .map((chat) => chat.placeName)
      .filter((name): name is string => Boolean(name)),
  );
  const selected = placeKind
    ? places.find((place) => place.kind === placeKind)
    : undefined;
  const placeListings = selected
    ? listingsForPlace(selected, listings)
    : listings.filter((row) => row.status === "open").slice(0, 8);
  const placePeople = selected
    ? peopleAtPlace(selected, town.residents, town.chats)
    : [];
  const placeChats = selected
    ? town.chats.filter(
        (chat) =>
          chat.placeId === selected.id || chat.placeName === selected.name,
      )
    : town.chats;
  const featured = town.avatars;
  const neighbors = town.residents.filter((row) => !row.isPublic);
  const streets = new Map<string, PublicTownResident[]>();
  for (const row of town.residents) {
    const key = row.street || "the neighborhood";
    const list = streets.get(key) ?? [];
    list.push(row);
    streets.set(key, list);
  }
  const households: Array<{ names: string; people: PublicTownResident[] }> = [];
  const seenHouse = new Set<string>();
  for (const row of town.residents) {
    if (!row.partnerName) continue;
    const partner = town.residents.find(
      (other) => other.displayName === row.partnerName,
    );
    const key = [row.id, partner?.id ?? row.partnerName].sort().join(":");
    if (seenHouse.has(key)) continue;
    seenHouse.add(key);
    households.push({
      names: partner
        ? `${row.displayName} + ${partner.displayName}`
        : `${row.displayName} + ${row.partnerName}`,
      people: partner ? [row, partner] : [row],
    });
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-700/40 via-[#0b0a0d] to-[#0b0a0d]" />
      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <section className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-violet-200">
            {placeKind ? PLACE_LABEL[placeKind] : "Avatar World"}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {placeKind
              ? selected?.keeperName
                ? `${selected.keeperName} keeps ${PLACE_LABEL[placeKind]}`
                : `${PLACE_LABEL[placeKind]} is open`
              : "A town that lives without you"}
          </h1>
          <p className="mt-3 text-zinc-300">
            {placeKind
              ? selected?.note ||
                "A place in the town. Neighbors pass through, buy things, and talk."
              : "Residents work jobs, hang out at the lake, the park, the bar, and the rec hall, and run into each other. Public avatars can be used in Content Studio."}
          </p>
          <p className="mt-2 text-sm text-zinc-400">{livedLine(town)}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-300">
            <span className="rounded-full bg-white/10 px-3 py-1">
              {town.residents.length} resident
              {town.residents.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              {featured.length} you can use
            </span>
            {town.economy && (
              <span className="rounded-full bg-white/10 px-3 py-1 tabular-nums">
                {town.economy.treasury.toLocaleString()} Sparks in the bank
              </span>
            )}
          </div>
        </section>

        {places.length > 0 && (
          <section className="mt-10 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {places.map((place) => {
              const active = place.kind === placeKind;
              return (
                <Link
                  key={place.id}
                  href={`/world/place/${place.kind}`}
                  className={`min-w-0 rounded-3xl border p-4 transition ${
                    active
                      ? "border-violet-400/70 bg-violet-500/20"
                      : "border-white/10 bg-white/5 hover:border-violet-400/50 hover:bg-white/10"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                    {place.name}
                    {HANGOUT_KINDS.has(place.kind as PublicPlaceKind)
                      ? " · hangout"
                      : ""}
                  </p>
                  <p className="mt-2 truncate text-sm font-medium">
                    {place.keeperName ?? "Open · no keeper yet"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                    {place.note}
                  </p>
                  {hangoutPlaces.has(place.name) && (
                    <p className="mt-2 text-[11px] font-medium text-violet-200">
                      They ran into each other here
                    </p>
                  )}
                </Link>
              );
            })}
          </section>
        )}

        {selected && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                  Right now
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {selected.keeperName
                    ? HANGOUT_KINDS.has(selected.kind as PublicPlaceKind)
                      ? `${selected.keeperName} is around`
                      : `${selected.keeperName} is on the desk`
                    : HANGOUT_KINDS.has(selected.kind as PublicPlaceKind)
                      ? "Open — come hang out"
                      : "No one holds the keys — the place still runs"}
                </p>
              </div>
              <Link
                href="/world"
                className="text-xs uppercase tracking-[0.18em] text-zinc-400 hover:text-white"
              >
                Back to the square
              </Link>
            </div>
            {placePeople.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {placePeople.map((row) => (
                  <li key={row.id}>
                    <ResidentName
                      id={row.id}
                      name={row.displayName}
                      isPublic={row.isPublic}
                      className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {town.economy && (
          <section className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                City Bank
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {town.economy.treasury.toLocaleString()}{" "}
                {town.economy.currencyLabel}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Wages, rent, and groceries clear here every day.
              </p>
              <Link
                href="/world/place/bank"
                className="mt-3 inline-block text-xs text-violet-200 hover:underline"
              >
                Open the bank
              </Link>
            </div>
            <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                {selected?.kind === "shop"
                  ? "On the counter"
                  : selected?.kind === "rooms"
                    ? "Rooms and keys"
                    : selected && HANGOUT_KINDS.has(selected.kind as PublicPlaceKind)
                      ? "What happens here"
                      : "Market"}
              </p>
              {placeListings.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">
                  {selected && HANGOUT_KINDS.has(selected.kind as PublicPlaceKind)
                    ? "People come here to hang out. After they live a day, you'll see who ran into each other."
                    : "Nothing listed yet. After they live a day, a loaf or a room shows up here."}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {placeListings.map((row) => (
                    <li key={row.id} className="text-sm">
                      <p className="font-medium">
                        {row.title}{" "}
                        <span className="text-zinc-400">
                          · {row.price} Sparks
                        </span>
                      </p>
                      <p className="text-xs text-zinc-400">
                        {row.sellerName} · {row.kind}
                        {row.status === "sold"
                          ? ` · bought by ${row.buyerName ?? "a neighbor"}`
                          : " · for sale"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={
                  selected && HANGOUT_KINDS.has(selected.kind as PublicPlaceKind)
                    ? "/world"
                    : "/world/place/market"
                }
                className="mt-3 inline-block text-xs text-violet-200 hover:underline"
              >
                {selected && HANGOUT_KINDS.has(selected.kind as PublicPlaceKind)
                  ? "Back to the square"
                  : "Walk the market"}
              </Link>
            </div>
          </section>
        )}

        {households.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Households</h2>
            <p className="mt-1 text-sm text-zinc-400">
              They keep building a life together — and that life is in their voice
              when you use them.
            </p>
            <ul className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
              {households.map((house) => (
                <li
                  key={house.names}
                  className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4"
                >
                  <p className="font-medium text-rose-100">{house.names}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {house.people
                      .map((row) => row.street || row.occupation)
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {featured.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-semibold">Avatars you can use</h2>
              <p className="text-xs text-zinc-500">
                Sign in and they present your crawled pages.
              </p>
            </div>
            <ul className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((resident) => (
                <ResidentCard
                  key={resident.id}
                  resident={resident}
                  featured
                />
              ))}
            </ul>
          </section>
        )}

        {town.residents.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold">Who lives here</h2>
            <div className="mt-4 space-y-6">
              {[...streets.entries()].map(([street, people]) => (
                <div key={street}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    {street}
                  </p>
                  <ul className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {people.map((resident) => (
                      <ResidentCard key={resident.id} resident={resident} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {town.threads.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold">Today in the square</h2>
            <div className="mt-4 space-y-4">
              {town.threads.slice(0, 8).map((thread) => (
                <PublicThread
                  key={thread.id}
                  thread={thread}
                  publicIds={publicIds}
                />
              ))}
            </div>
          </section>
        )}

        {placeChats.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold">
              {selected
                ? `At ${selected.name}`
                : "Where they ran into each other"}
            </h2>
            <div className="mt-4 space-y-4">
              {placeChats.map((chat) => (
                <PublicChat
                  key={chat.conversationId}
                  chat={chat}
                  publicIds={publicIds}
                />
              ))}
            </div>
          </section>
        )}

        {town.lore.length > 0 && !placeKind && (
          <section className="mt-12 rounded-3xl border border-amber-200/20 bg-amber-500/10 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-100">
              World story so far
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-zinc-200">
              {town.lore.map((beat) => (
                <li key={beat} className="flex gap-2">
                  <span className="text-amber-200">✦</span>
                  <span>{beat}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {town.residents.length === 0 && (
          <p className="mt-16 text-sm text-zinc-400">
            No one has moved in yet. Check back after the town opens a few
            doors.
          </p>
        )}

        {featured.length === 0 && neighbors.length > 0 && (
          <p className="mt-8 text-sm text-zinc-400">
            The town is standing. Public-use avatars will show a Use button when
            an admin allows them.
          </p>
        )}
      </div>
    </div>
  );
}
