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

export type JobSpec = {
  title: string;
  employer: string;
  wage: number;
  starter: number;
  goods: CatalogGood[];
};

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
};

export const JOB_TITLES = Object.keys(JOBS);

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function jobForOccupation(occupation: string): JobSpec {
  const key = occupation.trim().toLowerCase();
  if (JOBS[key]) return JOBS[key]!;
  const partial = Object.keys(JOBS).find(
    (title) => key.includes(title) || title.includes(key),
  );
  if (partial && JOBS[partial]) return { ...JOBS[partial]!, title: occupation || JOBS[partial]!.title };
  const wage = 35 + (hashString(key || "odd jobs") % 60);
  return {
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
  };
}

export type WorldAccountCard = {
  influencerId: string;
  displayName: string;
  handle: string;
  occupation: string;
  balance: number;
  wage: number;
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

export type WorldEconomySnapshot = {
  currency: string;
  currencyLabel: string;
  treasury: number;
  jobTitles: string[];
  accounts: WorldAccountCard[];
  listings: WorldMarketListing[];
  transfers: WorldLedgerEntry[];
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
    },
  });
}

export async function ensureResidentAccount(input: {
  userId: string;
  influencerId: string;
  occupation: string;
}): Promise<{ balance: number; wage: number; employer: string; opened: boolean }> {
  await ensureBank(input.userId);
  const job = jobForOccupation(input.occupation);
  const existing = await prisma.worldAccount.findUnique({
    where: {
      userId_influencerId: { userId: input.userId, influencerId: input.influencerId },
    },
  });
  if (existing) {
    if (existing.wage !== job.wage || existing.employer !== job.employer) {
      const updated = await prisma.worldAccount.update({
        where: { id: existing.id },
        data: { wage: job.wage, employer: job.employer },
      });
      return {
        balance: updated.balance,
        wage: updated.wage,
        employer: updated.employer,
        opened: false,
      };
    }
    return {
      balance: existing.balance,
      wage: existing.wage,
      employer: existing.employer,
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
    opened: true,
  };
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

  await ensureBank(userId);
  for (const avatar of avatars) {
    const occupation =
      avatar.memory &&
      typeof avatar.memory === "object" &&
      avatar.memory !== null &&
      "world" in avatar.memory
        ? String(
            (avatar.memory as { world?: { occupation?: string } }).world?.occupation ?? "",
          )
        : "";
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

  return {
    currency: WORLD_CURRENCY,
    currencyLabel: WORLD_CURRENCY_LABEL,
    treasury: bank?.balance ?? 0,
    jobTitles: JOB_TITLES,
    accounts: accounts
      .filter((row) => row.influencerId !== WORLD_BANK_ID)
      .map((row) => {
        const who = byId.get(row.influencerId);
        return {
          influencerId: row.influencerId,
          displayName: who?.displayName ?? "Resident",
          handle: who?.handle ?? "resident",
          occupation: row.employer,
          balance: row.balance,
          wage: row.wage,
          employer: row.employer,
        };
      }),
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
  };
}

export type EconomyDayResult = {
  wages: number;
  listings: number;
  sales: number;
  beat: string;
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
  const empty = { wages: 0, listings: 0, sales: 0, beat: "" };
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
      if (good) {
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

  const beat = [
    wages > 0 ? `${wages} got paid.` : "",
    listings > 0 ? "Someone listed a thing for sale." : "",
    sales > 0 ? `${sales} sale${sales === 1 ? "" : "s"} went through.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { wages, listings, sales, beat };
}