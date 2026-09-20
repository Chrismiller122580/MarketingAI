import { prisma } from "@/lib/db";

export const WORLD_BANK_ID = "__city_bank__";
export const WORLD_CURRENCY = "spark";
export const WORLD_CURRENCY_LABEL = "Sparks";

export type CatalogGood = {
  title: string;
  kind: "good" | "service";
  price: number;
  body: string;
};

export type JobRole = "worker" | "landlord" | "grocer" | "teller";

export type JobSpec = {
  title: string;
  employer: string;
  wage: number;
  starter: number;
  goods: CatalogGood[];
  rent?: number;
  role?: JobRole;
};

export const TOWN_STARTER_JOBS = [
  "community baker",
  "grocer",
  "landlord",
  "bank teller",
  "night-shift nurse",
  "bike mechanic",
  "bus driver",
  "street poet",
] as const;

const JOBS: Record<string, JobSpec> = {
  "jazz pianist": {
    title: "jazz pianist",
    employer: "corner bars and Sunday second-lines",
    wage: 85,
    starter: 120,
    goods: [
      { title: "a late set", kind: "service", price: 40, body: "Two hours, a worn upright, no requests for Wonderwall." },
      { title: "a lesson in voicings", kind: "service", price: 28, body: "Sit next to him. Leave playing something that sounds like home." },
    ],
  },
  "street photographer": {
    title: "street photographer",
    employer: "zines and strangers who said yes",
    wage: 70,
    starter: 95,
    goods: [
      { title: "a print from last night's rain", kind: "good", price: 22, body: "Fiber paper. The person in it never asked for it back." },
    ],
  },
  "community baker": {
    title: "community baker",
    employer: "the neighborhood shop",
    wage: 65,
    starter: 80,
    goods: [
      { title: "a still-warm loaf", kind: "good", price: 8, body: "Crack the crust and it sighs." },
      { title: "a birthday cake", kind: "good", price: 32, body: "No plastic flowers. Real fruit, too much frosting." },
    ],
  },
  "climate journalist": {
    title: "climate journalist",
    employer: "the newsroom",
    wage: 110,
    starter: 140,
    goods: [
      { title: "a field notebook copy", kind: "good", price: 18, body: "Water-stained. The story that didn't make the cut." },
    ],
  },
  "skate shop owner": {
    title: "skate shop owner",
    employer: "the shop on the plaza",
    wage: 60,
    starter: 90,
    goods: [
      { title: "a used deck", kind: "good", price: 35, body: "Gripped, not pretty. It still pops." },
    ],
  },
  "retired librarian": {
    title: "retired librarian",
    employer: "pension and quiet gigs",
    wage: 55,
    starter: 160,
    goods: [
      { title: "a repaired hardcover", kind: "good", price: 12, body: "She sewed the spine herself. Keep it." },
    ],
  },
  "tattoo artist": {
    title: "tattoo artist",
    employer: "her own studio",
    wage: 130,
    starter: 150,
    goods: [
      { title: "a small flash tattoo", kind: "service", price: 90, body: "One sitting. You pick from the wall. She won't rush it." },
    ],
  },
  "youth soccer coach": {
    title: "youth soccer coach",
    employer: "weekend league",
    wage: 50,
    starter: 70,
    goods: [
      { title: "an extra training hour", kind: "service", price: 15, body: "Dusty pitch. He brings the balls. You bring the kids." },
    ],
  },
  ceramicist: {
    title: "ceramicist",
    employer: "the slow studio",
    wage: 75,
    starter: 110,
    goods: [
      { title: "a tea bowl", kind: "good", price: 42, body: "Imperfect on purpose. Use it every morning." },
    ],
  },
  "indie game designer": {
    title: "indie game designer",
    employer: "itch.io and night trams",
    wage: 80,
    starter: 100,
    goods: [
      { title: "a tiny game key", kind: "good", price: 12, body: "Twenty minutes. It might make you cry-laugh." },
    ],
  },
  "desert botanist": {
    title: "desert botanist",
    employer: "the field station",
    wage: 95,
    starter: 110,
    goods: [
      { title: "a cutting in a paper bag", kind: "good", price: 14, body: "Don't overwater. He wrote the name in pencil." },
    ],
  },
  "night-shift nurse": {
    title: "night-shift nurse",
    employer: "the hospital",
    wage: 105,
    starter: 90,
    goods: [
      { title: "a thermos of coffee at 3am", kind: "good", price: 6, body: "She already poured it. Sit down." },
    ],
  },
  muralist: {
    title: "muralist",
    employer: "walls that pay",
    wage: 90,
    starter: 85,
    goods: [
      { title: "a sketch for a wall", kind: "service", price: 45, body: "Chalk on brick first. Then color if the street says yes." },
    ],
  },
  "spice stall cook": {
    title: "spice stall cook",
    employer: "the family stall",
    wage: 58,
    starter: 75,
    goods: [
      { title: "a paper cone of cumin and stories", kind: "good", price: 9, body: "He will not sell you the dusty jar. This is the good stuff." },
    ],
  },
  "late-night radio DJ": {
    title: "late-night radio DJ",
    employer: "the 1am slot",
    wage: 48,
    starter: 70,
    goods: [
      { title: "a burned CD of last night", kind: "good", price: 10, body: "No algorithm. Just the deep cuts and the rain." },
    ],
  },
  "hanbok restorer": {
    title: "hanbok restorer",
    employer: "the alley atelier",
    wage: 88,
    starter: 130,
    goods: [
      { title: "a mended sleeve", kind: "service", price: 36, body: "Invisible thread. The garment keeps its age." },
    ],
  },
  "fado singer": {
    title: "fado singer",
    employer: "the small house",
    wage: 70,
    starter: 85,
    goods: [
      { title: "a song at the table", kind: "service", price: 25, body: "No microphone. You buy wine. He stays until the room is quiet." },
    ],
  },
  "bush pilot": {
    title: "bush pilot",
    employer: "charters and weather",
    wage: 140,
    starter: 160,
    goods: [
      { title: "a seat to the next strip", kind: "service", price: 75, body: "Weight and weather decide. Pack light." },
    ],
  },
  "bike mechanic": {
    title: "bike mechanic",
    employer: "the corner stand",
    wage: 62,
    starter: 80,
    goods: [
      { title: "a true wheel", kind: "service", price: 20, body: "He does it while you wait. The tick is gone." },
    ],
  },
  "marine biologist": {
    title: "marine biologist",
    employer: "the coastal lab",
    wage: 115,
    starter: 130,
    goods: [
      { title: "a morning on the boat", kind: "service", price: 50, body: "You hold the clipboard. She names what comes up." },
    ],
  },
  "street poet": {
    title: "street poet",
    employer: "tips and open mics",
    wage: 35,
    starter: 55,
    goods: [
      { title: "a poem on receipt paper", kind: "good", price: 7, body: "Written for whoever is standing there. Keep it in a book." },
    ],
  },
  "dock cook": {
    title: "dock cook",
    employer: "the morning shift",
    wage: 54,
    starter: 70,
    goods: [
      { title: "a bowl before the boats leave", kind: "good", price: 11, body: "Hot, cheap, no speech. Sit with the crew." },
    ],
  },
  grocer: {
    title: "grocer",
    employer: "the corner shop",
    wage: 62,
    starter: 88,
    role: "grocer",
    goods: [
      { title: "a bag of rice and onions", kind: "good", price: 9, body: "The onions are sweet. Don't skip the greens on top." },
      { title: "milk, bread, and something for later", kind: "good", price: 11, body: "She already bagged it. Pay at the counter." },
    ],
  },
  landlord: {
    title: "landlord",
    employer: "the rooms above the shop",
    wage: 70,
    starter: 140,
    rent: 0,
    role: "landlord",
    goods: [
      { title: "a room for the month", kind: "service", price: 48, body: "Window on the alley. Key on a string. Rent is due either way." },
      { title: "a spare key", kind: "good", price: 6, body: "You lost yours. He has extras. Don't make it a habit." },
    ],
  },
  "bank teller": {
    title: "bank teller",
    employer: "City Bank",
    wage: 78,
    starter: 100,
    role: "teller",
    goods: [
      { title: "a quiet hour at the counter", kind: "service", price: 0, body: "She counts Sparks. You wait. The city stays solvent." },
    ],
  },
  "bus driver": {
    title: "bus driver",
    employer: "the city route",
    wage: 68,
    starter: 85,
    goods: [
      { title: "a ride across town", kind: "service", price: 4, body: "Sit down. Hold the rail. He knows every stop by the smell of it." },
    ],
  },
  "fishing guide": {
    title: "fishing guide",
    employer: "the dock at dusk",
    wage: 62,
    starter: 80,
    goods: [
      { title: "an hour on the lake", kind: "service", price: 18, body: "A borrowed rod. He already knows where they are biting." },
    ],
  },
  "park ranger": {
    title: "park ranger",
    employer: "the green",
    wage: 64,
    starter: 85,
    goods: [
      { title: "a map of the oak paths", kind: "good", price: 5, body: "Folded wrong on purpose. The shortcut is marked in pencil." },
    ],
  },
  bartender: {
    title: "bartender",
    employer: "The Bar",
    wage: 72,
    starter: 90,
    goods: [
      { title: "whatever's on tap", kind: "good", price: 7, body: "She doesn't ask what you do. The glass is cold." },
    ],
  },
  "rec hall host": {
    title: "rec hall host",
    employer: "the rec hall",
    wage: 58,
    starter: 75,
    goods: [
      { title: "a table until close", kind: "service", price: 6, body: "Darts, cards, or the game on the back wall. Keep the chalk." },
    ],
  },
};

export const JOB_TITLES = Object.keys(JOBS);

export type ResolvedJob = JobSpec & { rent: number; role: JobRole };

function roleForTitle(title: string): JobRole {
  const t = title.toLowerCase();
  if (t.includes("landlord") || t.includes("landlady")) return "landlord";
  if (t.includes("grocer")) return "grocer";
  if (t.includes("teller") || t.includes("bank clerk")) return "teller";
  return "worker";
}

function rentForJob(job: Pick<JobSpec, "wage" | "rent" | "role" | "title">): number {
  if (typeof job.rent === "number") return job.rent;
  if ((job.role ?? roleForTitle(job.title)) === "landlord") return 0;
  return Math.max(8, Math.round(job.wage * 0.18));
}

function resolveJob(job: JobSpec): ResolvedJob {
  const role = job.role ?? roleForTitle(job.title);
  return { ...job, role, rent: rentForJob({ ...job, role }) };
}

export function occupationMatches(occupation: string, title: string): boolean {
  const a = occupation.trim().toLowerCase();
  const b = title.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function missingTownJobs(occupations: string[]): string[] {
  return TOWN_STARTER_JOBS.filter(
    (job) => !occupations.some((occ) => occupationMatches(occ, job)),
  );
}

export function streetForOccupation(occupation: string, location?: string): string {
  const job = jobForOccupation(occupation);
  const occ = occupation.trim().toLowerCase();
  if (job.role === "grocer" || occupationMatches(occ, "baker") || occupationMatches(occ, "cook")) {
    return "Market Street";
  }
  if (job.role === "landlord") return "the rooms";
  if (job.role === "teller") return "Bank Row";
  if (occupationMatches(occ, "nurse")) return "Hospital Hill";
  if (occupationMatches(occ, "mechanic")) return "the corner stand";
  if (occupationMatches(occ, "bus driver")) return "the route";
  if (
    occupationMatches(occ, "fishing") ||
    occupationMatches(occ, "dock") ||
    occupationMatches(occ, "lifeguard")
  ) {
    return "the shoreline";
  }
  if (
    occupationMatches(occ, "park ranger") ||
    occupationMatches(occ, "groundskeeper") ||
    occupationMatches(occ, "soccer")
  ) {
    return "the green";
  }
  if (
    occupationMatches(occ, "bartender") ||
    occupationMatches(occ, "barkeep") ||
    occupationMatches(occ, "pianist")
  ) {
    return "last call";
  }
  if (
    occupationMatches(occ, "arcade") ||
    occupationMatches(occ, "rec hall") ||
    occupationMatches(occ, "rec league")
  ) {
    return "the rec hall";
  }
  const city = location?.split(",")[0]?.trim();
  return city ? `${city} side` : "the neighborhood";
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function jobForOccupation(occupation: string): ResolvedJob {
  const key = occupation.trim().toLowerCase();
  if (JOBS[key]) return resolveJob(JOBS[key]!);
  const partial = Object.keys(JOBS).find(
    (title) => key.includes(title) || title.includes(key),
  );
  if (partial && JOBS[partial]) {
    return resolveJob({ ...JOBS[partial]!, title: occupation || JOBS[partial]!.title });
  }
  const wage = 35 + (hashString(key || "odd jobs") % 60);
  return resolveJob({
    title: occupation.trim() || "odd jobs",
    employer: "the city",
    wage,
    starter: 70 + (wage % 40),
    goods: [
      {
        title: "a day's help",
        kind: "service",
        price: Math.max(8, Math.round(wage / 3)),
        body: "Show up. Do the work. Get paid in Sparks.",
      },
    ],
  });
}

export type WorldAccountCard = {
  influencerId: string;
  displayName: string;
  handle: string;
  occupation: string;
  balance: number;
  wage: number;
  rent: number;
  employer: string;
};

export type WorldMarketListing = {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerHandle: string;
  buyerId?: string;
  buyerName?: string;
  title: string;
  body: string;
  kind: string;
  price: number;
  status: string;
  createdAt: string;
};

export type WorldLedgerEntry = {
  id: string;
  fromId?: string;
  toId?: string;
  amount: number;
  kind: string;
  note: string;
  createdAt: string;
};

export const WORLD_PLACE_KINDS = [
  "bank",
  "market",
  "rooms",
  "shop",
  "lake",
  "park",
  "bar",
  "games",
] as const;

export type WorldPlaceKind = (typeof WORLD_PLACE_KINDS)[number];

export const SOCIAL_HANGOUTS: Array<{
  id: Extract<WorldPlaceKind, "lake" | "park" | "bar" | "games">;
  name: string;
  street: string;
  scene: string;
}> = [
  {
    id: "lake",
    name: "The Lake",
    street: "the shoreline",
    scene: "Dusk on the water. Skip a rock. Talk quiet.",
  },
  {
    id: "park",
    name: "The Park",
    street: "the green",
    scene: "A worn bench under the oak. The day is cooling off.",
  },
  {
    id: "bar",
    name: "The Bar",
    street: "last call",
    scene: "Low lights, a sticky rail. One more, then home.",
  },
  {
    id: "games",
    name: "The Rec Hall",
    street: "the rec hall",
    scene: "Darts, a scuffed table, someone keeping score wrong.",
  },
];

export type WorldPlace = {
  id: WorldPlaceKind;
  name: string;
  kind: WorldPlaceKind;
  keeperId?: string;
  keeperName?: string;
  keeperOccupation?: string;
  note: string;
};

export type WorldEconomySnapshot = {
  currency: string;
  currencyLabel: string;
  treasury: number;
  jobTitles: string[];
  townJobs: string[];
  missingTownJobs: string[];
  townReady: boolean;
  accounts: WorldAccountCard[];
  listings: WorldMarketListing[];
  transfers: WorldLedgerEntry[];
  places: WorldPlace[];
};

async function ensureBank(userId: string) {
  return prisma.worldAccount.upsert({
    where: { userId_influencerId: { userId, influencerId: WORLD_BANK_ID } },
    update: {},
    create: {
      userId,
      influencerId: WORLD_BANK_ID,
      balance: 100_000,
      wage: 0,
      employer: "City Bank",
      rent: 0,
    },
  });
}

export async function ensureResidentAccount(input: {
  userId: string;
  influencerId: string;
  occupation: string;
}): Promise<{ balance: number; wage: number; employer: string; rent: number; opened: boolean }> {
  await ensureBank(input.userId);
  const job = jobForOccupation(input.occupation);
  const existing = await prisma.worldAccount.findUnique({
    where: {
      userId_influencerId: { userId: input.userId, influencerId: input.influencerId },
    },
  });
  if (existing) {
    if (
      existing.wage !== job.wage ||
      existing.employer !== job.employer ||
      existing.rent !== job.rent
    ) {
      const updated = await prisma.worldAccount.update({
        where: { id: existing.id },
        data: { wage: job.wage, employer: job.employer, rent: job.rent },
      });
      return {
        balance: updated.balance,
        wage: updated.wage,
        employer: updated.employer,
        rent: updated.rent,
        opened: false,
      };
    }
    return {
      balance: existing.balance,
      wage: existing.wage,
      employer: existing.employer,
      rent: existing.rent,
      opened: false,
    };
  }

  const created = await prisma.worldAccount.create({
    data: {
      userId: input.userId,
      influencerId: input.influencerId,
      balance: job.starter,
      wage: job.wage,
      employer: job.employer,
      rent: job.rent,
    },
  });

  await prisma.worldAccount.update({
    where: { userId_influencerId: { userId: input.userId, influencerId: WORLD_BANK_ID } },
    data: { balance: { decrement: job.starter } },
  });

  await prisma.worldTransfer.create({
    data: {
      userId: input.userId,
      fromId: WORLD_BANK_ID,
      toId: input.influencerId,
      amount: job.starter,
      kind: "seed",
      note: `Opening balance for a ${job.title}.`,
    },
  });

  return {
    balance: created.balance,
    wage: created.wage,
    employer: created.employer,
    rent: created.rent,
    opened: true,
  };
}

function occupationFromMemory(memory: unknown): string {
  if (!memory || typeof memory !== "object" || !("world" in memory)) return "";
  return String((memory as { world?: { occupation?: string } }).world?.occupation ?? "");
}

function findByRole(
  accounts: WorldAccountCard[],
  role: JobRole,
): WorldAccountCard | undefined {
  return accounts.find((row) => jobForOccupation(row.occupation).role === role);
}

function buildPlaces(
  accounts: WorldAccountCard[],
  listings: Array<{ status: string }>,
  treasury: number,
): WorldPlace[] {
  const landlord = findByRole(accounts, "landlord");
  const grocer = findByRole(accounts, "grocer");
  const teller = findByRole(accounts, "teller");
  const baker = accounts.find((row) => occupationMatches(row.occupation, "baker"));
  const open = listings.filter((row) => row.status === "open").length;
  const shopkeeper = grocer ?? baker;
  const dock =
    accounts.find((row) => occupationMatches(row.occupation, "fishing")) ??
    accounts.find((row) => occupationMatches(row.occupation, "dock")) ??
    accounts.find((row) => occupationMatches(row.occupation, "lifeguard"));
  const ranger =
    accounts.find((row) => occupationMatches(row.occupation, "park ranger")) ??
    accounts.find((row) => occupationMatches(row.occupation, "groundskeeper")) ??
    accounts.find((row) => occupationMatches(row.occupation, "soccer"));
  const bartender =
    accounts.find((row) => occupationMatches(row.occupation, "bartender")) ??
    accounts.find((row) => occupationMatches(row.occupation, "pianist"));
  const recHost =
    accounts.find((row) => occupationMatches(row.occupation, "rec hall")) ??
    accounts.find((row) => occupationMatches(row.occupation, "arcade"));

  return [
    {
      id: "bank",
      name: "City Bank",
      kind: "bank",
      keeperId: teller?.influencerId,
      keeperName: teller?.displayName,
      keeperOccupation: teller?.occupation,
      note: teller
        ? `${teller.displayName} keeps the window open. Treasury: ${treasury.toLocaleString()} Sparks.`
        : `The vault is unattended. Treasury: ${treasury.toLocaleString()} Sparks.`,
    },
    {
      id: "market",
      name: "The Market",
      kind: "market",
      keeperId: grocer?.influencerId,
      keeperName: grocer?.displayName,
      keeperOccupation: grocer?.occupation,
      note:
        open > 0
          ? `${open} thing${open === 1 ? "" : "s"} for sale. Neighbors buy with Sparks.`
          : "Stalls are empty until someone lists a loaf, a room, a ride.",
    },
    {
      id: "rooms",
      name: "Rooms",
      kind: "rooms",
      keeperId: landlord?.influencerId,
      keeperName: landlord?.displayName,
      keeperOccupation: landlord?.occupation,
      note: landlord
        ? `${landlord.displayName} collects the rent. Window on the alley, key on a string.`
        : "Nobody holds the keys yet. Rent still lands at City Bank.",
    },
    {
      id: "shop",
      name: "Corner Shop",
      kind: "shop",
      keeperId: shopkeeper?.influencerId,
      keeperName: shopkeeper?.displayName,
      keeperOccupation: shopkeeper?.occupation,
      note: shopkeeper
        ? `${shopkeeper.displayName} sells the day's food. Milk, bread, something for later.`
        : "The shop is dark. Found a grocer or a baker and it opens.",
    },
    {
      id: "lake",
      name: "The Lake",
      kind: "lake",
      keeperId: dock?.influencerId,
      keeperName: dock?.displayName,
      keeperOccupation: dock?.occupation,
      note: dock
        ? `${dock.displayName} watches the dock. The water is still open after work.`
        : "The water is open. Nobody minds if you sit and skip a rock.",
    },
    {
      id: "park",
      name: "The Park",
      kind: "park",
      keeperId: ranger?.influencerId,
      keeperName: ranger?.displayName,
      keeperOccupation: ranger?.occupation,
      note: ranger
        ? `${ranger.displayName} keeps the green. Benches, an oak, room to talk.`
        : "Grass worn thin under the oak. The park doesn't need a keeper to be open.",
    },
    {
      id: "bar",
      name: "The Bar",
      kind: "bar",
      keeperId: bartender?.influencerId,
      keeperName: bartender?.displayName,
      keeperOccupation: bartender?.occupation,
      note: bartender
        ? `${bartender.displayName} is behind the rail. Last call is a rumor.`
        : "Low lights, a sticky rail. Someone will pour if you wait.",
    },
    {
      id: "games",
      name: "The Rec Hall",
      kind: "games",
      keeperId: recHost?.influencerId,
      keeperName: recHost?.displayName,
      keeperOccupation: recHost?.occupation,
      note: recHost
        ? `${recHost.displayName} keeps the chalk and the score. Pickup until the lights cut.`
        : "Darts, a scuffed table, a game on the back wall. Come play.",
    },
  ];
}

async function transferSparks(input: {
  userId: string;
  fromId: string | null;
  toId: string | null;
  amount: number;
  kind: string;
  note: string;
  listingId?: string;
}): Promise<boolean> {
  if (input.amount <= 0) return false;
  const fromId = input.fromId ?? WORLD_BANK_ID;
  const toId = input.toId;
  if (!toId || fromId === toId) return false;

  const from = await prisma.worldAccount.findUnique({
    where: { userId_influencerId: { userId: input.userId, influencerId: fromId } },
  });
  if (!from || from.balance < input.amount) return false;

  await prisma.$transaction([
    prisma.worldAccount.update({
      where: { id: from.id },
      data: { balance: { decrement: input.amount } },
    }),
    prisma.worldAccount.update({
      where: { userId_influencerId: { userId: input.userId, influencerId: toId } },
      data: { balance: { increment: input.amount } },
    }),
    prisma.worldTransfer.create({
      data: {
        userId: input.userId,
        fromId,
        toId,
        amount: input.amount,
        kind: input.kind,
        listingId: input.listingId,
        note: input.note.slice(0, 240),
      },
    }),
  ]);
  return true;
}

export async function loadWorldEconomy(userId: string): Promise<WorldEconomySnapshot> {
  const avatars = await prisma.influencer.findMany({
    where: { userId },
    select: { id: true, displayName: true, handle: true, memory: true },
    take: 50,
  });
  const byId = new Map(avatars.map((row) => [row.id, row]));
  const occupationById = new Map<string, string>();

  await ensureBank(userId);
  for (const avatar of avatars) {
    const occupation = occupationFromMemory(avatar.memory);
    occupationById.set(avatar.id, occupation);
    await ensureResidentAccount({
      userId,
      influencerId: avatar.id,
      occupation,
    });
  }

  const [accounts, listings, transfers] = await Promise.all([
    prisma.worldAccount.findMany({
      where: { userId },
      orderBy: { balance: "desc" },
    }),
    prisma.worldListing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.worldTransfer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 16,
    }),
  ]);

  const bank = accounts.find((row) => row.influencerId === WORLD_BANK_ID);
  const residentCards: WorldAccountCard[] = accounts
    .filter((row) => row.influencerId !== WORLD_BANK_ID)
    .map((row) => {
      const who = byId.get(row.influencerId);
      const occupation = occupationById.get(row.influencerId) || row.employer;
      return {
        influencerId: row.influencerId,
        displayName: who?.displayName ?? "Resident",
        handle: who?.handle ?? "resident",
        occupation,
        balance: row.balance,
        wage: row.wage,
        rent: row.rent,
        employer: row.employer,
      };
    });

  const occupations = residentCards.map((row) => row.occupation);
  const missing = missingTownJobs(occupations);
  const places = buildPlaces(residentCards, listings, bank?.balance ?? 0);

  return {
    currency: WORLD_CURRENCY,
    currencyLabel: WORLD_CURRENCY_LABEL,
    treasury: bank?.balance ?? 0,
    jobTitles: JOB_TITLES,
    townJobs: [...TOWN_STARTER_JOBS],
    missingTownJobs: missing,
    townReady: missing.length === 0 && residentCards.length >= TOWN_STARTER_JOBS.length,
    accounts: residentCards,
    listings: listings.map((row) => {
      const seller = byId.get(row.sellerId);
      const buyer = row.buyerId ? byId.get(row.buyerId) : undefined;
      return {
        id: row.id,
        sellerId: row.sellerId,
        sellerName: seller?.displayName ?? "Someone",
        sellerHandle: seller?.handle ?? "resident",
        buyerId: row.buyerId ?? undefined,
        buyerName: buyer?.displayName,
        title: row.title,
        body: row.body,
        kind: row.kind,
        price: row.price,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      };
    }),
    transfers: transfers.map((row) => ({
      id: row.id,
      fromId: row.fromId ?? undefined,
      toId: row.toId ?? undefined,
      amount: row.amount,
      kind: row.kind,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    })),
    places,
  };
}

export type EconomyDayResult = {
  wages: number;
  listings: number;
  sales: number;
  rents: number;
  groceries: number;
  beat: string;
  landlordId?: string;
  grocerId?: string;
  tellerId?: string;
  bakerId?: string;
  rentPayers: string[];
  groceryBuyers: string[];
  salePairs: Array<{ buyerId: string; sellerId: string; title: string }>;
  seeds: string[];
};

function utcDayStart(now = new Date()): Date {
  return new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

export async function runEconomyDay(input: {
  userId: string;
  avatars: Array<{
    id: string;
    displayName: string;
    occupation: string;
    mood: string;
  }>;
}): Promise<EconomyDayResult> {
  const empty: EconomyDayResult = {
    wages: 0,
    listings: 0,
    sales: 0,
    rents: 0,
    groceries: 0,
    beat: "",
    rentPayers: [],
    groceryBuyers: [],
    salePairs: [],
    seeds: [],
  };
  if (input.avatars.length === 0) return empty;

  await ensureBank(input.userId);
  for (const avatar of input.avatars) {
    await ensureResidentAccount({
      userId: input.userId,
      influencerId: avatar.id,
      occupation: avatar.occupation,
    });
  }

  const dayStart = utcDayStart();
  const alreadyPaid = await prisma.worldTransfer.findMany({
    where: {
      userId: input.userId,
      kind: "wage",
      createdAt: { gte: dayStart },
    },
    select: { toId: true },
  });
  const paidIds = new Set(alreadyPaid.map((row) => row.toId).filter(Boolean));

  let wages = 0;
  for (const avatar of input.avatars) {
    if (paidIds.has(avatar.id)) continue;
    const account = await prisma.worldAccount.findUnique({
      where: {
        userId_influencerId: { userId: input.userId, influencerId: avatar.id },
      },
    });
    if (!account || account.wage <= 0) continue;
    const ok = await transferSparks({
      userId: input.userId,
      fromId: WORLD_BANK_ID,
      toId: avatar.id,
      amount: account.wage,
      kind: "wage",
      note: `${avatar.displayName} got paid as a ${avatar.occupation || account.employer}.`,
    });
    if (!ok) continue;
    wages += 1;
    await prisma.creatorLearningEvent.create({
      data: {
        userId: input.userId,
        influencerId: avatar.id,
        eventType: "world_wage",
        payload: {
          kind: "wage",
          title: "Got paid",
          body: `${avatar.displayName} collected ${account.wage} Sparks from ${account.employer}.`,
          mood: avatar.mood,
        },
      },
    });
  }

  const landlord =
    input.avatars.find((row) => jobForOccupation(row.occupation).role === "landlord") ??
    null;
  const grocer =
    input.avatars.find((row) => jobForOccupation(row.occupation).role === "grocer") ??
    input.avatars.find((row) => occupationMatches(row.occupation, "baker")) ??
    input.avatars.find((row) => occupationMatches(row.occupation, "cook")) ??
    null;

  const alreadyRented = await prisma.worldTransfer.findMany({
    where: {
      userId: input.userId,
      kind: "rent",
      createdAt: { gte: dayStart },
    },
    select: { fromId: true },
  });
  const rentedIds = new Set(alreadyRented.map((row) => row.fromId).filter(Boolean));

  let rents = 0;
  const rentPayers: string[] = [];
  const rentTo = landlord?.id ?? WORLD_BANK_ID;
  for (const avatar of input.avatars) {
    if (rentedIds.has(avatar.id)) continue;
    if (landlord && avatar.id === landlord.id) continue;
    const account = await prisma.worldAccount.findUnique({
      where: {
        userId_influencerId: { userId: input.userId, influencerId: avatar.id },
      },
    });
    if (!account || account.rent <= 0) continue;
    const ok = await transferSparks({
      userId: input.userId,
      fromId: avatar.id,
      toId: rentTo,
      amount: account.rent,
      kind: "rent",
      note: landlord
        ? `${avatar.displayName} paid ${account.rent} Sparks rent to ${landlord.displayName}.`
        : `${avatar.displayName} paid ${account.rent} Sparks rent to City Bank.`,
    });
    if (!ok) continue;
    rents += 1;
    rentPayers.push(avatar.id);
  }
  if (rents > 0) {
    await prisma.creatorLearningEvent.create({
      data: {
        userId: input.userId,
        influencerId: landlord?.id ?? input.avatars[0]!.id,
        eventType: "world_rent",
        payload: {
          kind: "rent",
          title: "Rent came due",
          body: landlord
            ? `${rents} neighbor${rents === 1 ? "" : "s"} paid rent to ${landlord.displayName}.`
            : `${rents} neighbor${rents === 1 ? "" : "s"} paid rent to City Bank.`,
          mood: landlord?.mood ?? input.avatars[0]?.mood,
        },
      },
    });
  }

  const alreadyGroceries = await prisma.worldTransfer.findMany({
    where: {
      userId: input.userId,
      kind: "grocery",
      createdAt: { gte: dayStart },
    },
    select: { fromId: true },
  });
  const groceryIds = new Set(alreadyGroceries.map((row) => row.fromId).filter(Boolean));

  let groceries = 0;
  const groceryBuyers: string[] = [];
  if (grocer) {
    for (const avatar of input.avatars) {
      if (groceryIds.has(avatar.id)) continue;
      if (avatar.id === grocer.id) continue;
      const price = 7 + (hashString(`${avatar.id}:${dayStart.toISOString()}:food`) % 6);
      const ok = await transferSparks({
        userId: input.userId,
        fromId: avatar.id,
        toId: grocer.id,
        amount: price,
        kind: "grocery",
        note: `${avatar.displayName} bought groceries from ${grocer.displayName} for ${price} Sparks.`,
      });
      if (!ok) continue;
      groceries += 1;
      groceryBuyers.push(avatar.id);
    }
    if (groceries > 0) {
      await prisma.creatorLearningEvent.create({
        data: {
          userId: input.userId,
          influencerId: grocer.id,
          eventType: "world_grocery",
          payload: {
            kind: "grocery",
            title: "The shop did a day's business",
            body: `${groceries} neighbor${groceries === 1 ? "" : "s"} bought food from ${grocer.displayName}.`,
            mood: grocer.mood,
          },
        },
      });
    }
  }

  const openCount = await prisma.worldListing.count({
    where: { userId: input.userId, status: "open" },
  });
  let listings = 0;
  if (openCount < Math.min(8, Math.max(1, input.avatars.length))) {
    const seller =
      input.avatars[hashString(`${input.userId}:list:${dayStart.toISOString()}`) % input.avatars.length];
    if (seller) {
      const job = jobForOccupation(seller.occupation);
      const good = job.goods[hashString(seller.id + dayStart.toISOString()) % job.goods.length] ?? job.goods[0];
      if (good && good.price > 0) {
        const listing = await prisma.worldListing.create({
          data: {
            userId: input.userId,
            sellerId: seller.id,
            title: good.title,
            body: good.body,
            kind: good.kind,
            price: good.price,
            status: "open",
          },
        });
        listings = 1;
        await prisma.creatorLearningEvent.create({
          data: {
            userId: input.userId,
            influencerId: seller.id,
            eventType: "world_listing",
            payload: {
              kind: "listing",
              title: "Put something up for sale",
              body: `${seller.displayName} listed ${good.title} for ${good.price} Sparks.`,
              mood: seller.mood,
              listingId: listing.id,
            },
          },
        });
      }
    }
  }

  let sales = 0;
  const salePairs: Array<{ buyerId: string; sellerId: string; title: string }> = [];
  const open = await prisma.worldListing.findMany({
    where: { userId: input.userId, status: "open" },
    orderBy: { createdAt: "asc" },
    take: 6,
  });
  for (const listing of open) {
    const buyers = input.avatars.filter((row) => row.id !== listing.sellerId);
    if (buyers.length === 0) break;
    const buyer = buyers[hashString(`${listing.id}:buy`) % buyers.length]!;
    const wallet = await prisma.worldAccount.findUnique({
      where: {
        userId_influencerId: { userId: input.userId, influencerId: buyer.id },
      },
    });
    if (!wallet || wallet.balance < listing.price) continue;
    const ok = await transferSparks({
      userId: input.userId,
      fromId: buyer.id,
      toId: listing.sellerId,
      amount: listing.price,
      kind: "purchase",
      listingId: listing.id,
      note: `${buyer.displayName} bought ${listing.title} from a neighbor.`,
    });
    if (!ok) continue;
    await prisma.worldListing.update({
      where: { id: listing.id },
      data: { status: "sold", buyerId: buyer.id },
    });
    sales += 1;
    salePairs.push({
      buyerId: buyer.id,
      sellerId: listing.sellerId,
      title: listing.title,
    });
    await prisma.creatorLearningEvent.create({
      data: {
        userId: input.userId,
        influencerId: buyer.id,
        eventType: "world_sale",
        payload: {
          kind: "sale",
          title: "Bought something",
          body: `${buyer.displayName} bought ${listing.title} for ${listing.price} Sparks.`,
          mood: buyer.mood,
          relatedInfluencerId: listing.sellerId,
          listingId: listing.id,
        },
      },
    });
    if (sales >= 2) break;
  }

  const teller =
    input.avatars.find((row) => jobForOccupation(row.occupation).role === "teller") ??
    null;
  const baker =
    input.avatars.find((row) => occupationMatches(row.occupation, "baker")) ?? null;

  const seeds = [
    wages > 0 ? `${wages} neighbors got paid.` : "",
    rents > 0 && landlord
      ? `${landlord.displayName} collected rent from ${rentPayers.length} tenant${rentPayers.length === 1 ? "" : "s"}.`
      : rents > 0
        ? `${rents} paid rent to City Bank.`
        : "",
    groceries > 0 && grocer
      ? `${groceryBuyers.length} neighbor${groceryBuyers.length === 1 ? "" : "s"} bought food from ${grocer.displayName}.`
      : "",
    ...salePairs.map(
      (row) => {
        const buyer = input.avatars.find((a) => a.id === row.buyerId);
        const seller = input.avatars.find((a) => a.id === row.sellerId);
        return buyer && seller
          ? `${buyer.displayName} bought ${row.title} from ${seller.displayName}.`
          : "";
      },
    ),
  ].filter(Boolean);

  const beat = [
    wages > 0 ? `${wages} got paid.` : "",
    rents > 0 ? `${rents} paid rent.` : "",
    groceries > 0 ? `${groceries} bought groceries.` : "",
    listings > 0 ? "Someone listed a thing for sale." : "",
    sales > 0 ? `${sales} sale${sales === 1 ? "" : "s"} went through.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    wages,
    listings,
    sales,
    rents,
    groceries,
    beat,
    landlordId: landlord?.id,
    grocerId: grocer?.id,
    tellerId: teller?.id,
    bakerId: baker?.id,
    rentPayers,
    groceryBuyers,
    salePairs,
    seeds,
  };
}

export async function seedEssentialListings(input: {
  userId: string;
  avatars: Array<{ id: string; displayName: string; occupation: string; mood?: string }>;
}): Promise<number> {
  if (input.avatars.length === 0) return 0;
  const openCount = await prisma.worldListing.count({
    where: { userId: input.userId, status: "open" },
  });
  if (openCount > 0) return 0;

  const wanted = input.avatars.filter((row) => {
    const job = jobForOccupation(row.occupation);
    return (
      job.role === "landlord" ||
      job.role === "grocer" ||
      occupationMatches(row.occupation, "baker") ||
      occupationMatches(row.occupation, "mechanic")
    );
  });
  const sellers = wanted.length > 0 ? wanted : input.avatars.slice(0, 3);
  let created = 0;
  for (const seller of sellers) {
    const job = jobForOccupation(seller.occupation);
    const good = job.goods.find((row) => row.price > 0) ?? job.goods[0];
    if (!good || good.price <= 0) continue;
    const listing = await prisma.worldListing.create({
      data: {
        userId: input.userId,
        sellerId: seller.id,
        title: good.title,
        body: good.body,
        kind: good.kind,
        price: good.price,
        status: "open",
      },
    });
    created += 1;
    await prisma.creatorLearningEvent.create({
      data: {
        userId: input.userId,
        influencerId: seller.id,
        eventType: "world_listing",
        payload: {
          kind: "listing",
          title: "Opened a stall",
          body: `${seller.displayName} listed ${good.title} for ${good.price} Sparks.`,
          mood: seller.mood ?? "curious",
          listingId: listing.id,
        },
      },
    });
  }
  return created;
}