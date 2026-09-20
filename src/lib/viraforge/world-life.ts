import { chatCompletion, hasAnyAiKey } from "@/lib/ai-client";
import { prisma } from "@/lib/db";
import {
  defaultCreatorAvatarValues,
  parseCreatorAvatar,
  type CreatorAvatarForm,
} from "@/lib/schemas/creator-avatar-schema";
import { defaultProductFactsValues } from "@/lib/schemas/product-facts-schema";
import {
  buildWorldGeneratedPost,
  contributeToWorldPost,
  ensureArrivalEvent,
  generateBackstoryContent,
  listWorldInfluencers,
  listWorldPosts,
  loadWorldDetail,
  loadWorldGenerationContext,
  patchWorldProfile,
  recordWorldEvent,
  rememberWorldBeat,
  saveWorldPost,
  tickedToday,
  generateNeighborChat,
  type WorldInfluencerCard,
  type WorldPostCard,
} from "./avatar-world";
import { generateNames, handleFromName } from "./avatar-name-generator";
import { upsertInfluencerWithFacts } from "./learning";

const MAX_RESIDENTS = 24;
const MOODS = [
  { mood: "inspired", note: "Something small clicked this morning." },
  { mood: "restless", note: "Can't sit still — the city is too loud." },
  { mood: "playful", note: "In the mood to tease a neighbor." },
  { mood: "ambitious", note: "Wants to ship something before sundown." },
  { mood: "quiet", note: "Keeping to themselves, watching." },
  { mood: "curious", note: "Asking better questions than yesterday." },
  { mood: "tender", note: "Thinking about the people they miss." },
  { mood: "focused", note: "One job today. The rest can wait." },
] as const;

type ResidentArchetype = {
  occupation: string;
  location: string;
  gender: CreatorAvatarForm["gender"];
  age: number;
  religion: string;
  socialClass: string;
  culturalNotes: string;
  wardrobe: string;
  hair: string;
  faceShape: string;
  height: string;
  bodyType: number;
  interests: string[];
  values: string[];
  goals: string[];
  voice: string;
};

const ARCHETYPES: ResidentArchetype[] = [
  {
    occupation: "jazz pianist",
    location: "New Orleans, Louisiana",
    gender: "male",
    age: 42,
    religion: "Spiritual, not churchy",
    socialClass: "Working artist • gig-to-gig",
    culturalNotes: "Creole roots, late nights, second-line Sundays",
    wardrobe: "Linen shirt, worn loafers, a ring from his grandmother",
    hair: "Short salt-and-pepper curls",
    faceShape: "Oval",
    height: "5'11\"",
    bodyType: 48,
    interests: ["jazz", "late walks", "coffee"],
    values: ["craft", "listening"],
    goals: ["finish an album that sounds like home"],
    voice:
      "Personality: Warm, unhurried, a little wry. Voice: Soft Southern cadence, talks like a song is about to start.",
  },
  {
    occupation: "street photographer",
    location: "Tokyo, Japan",
    gender: "female",
    age: 31,
    religion: "Shinto-curious, mostly secular",
    socialClass: "Creative class • city renter",
    culturalNotes: "Tokyo nights, film cameras, convenience-store dinners",
    wardrobe: "Oversized black jacket, straight jeans, scuffed sneakers",
    hair: "Sharp black bob with a side part",
    faceShape: "Heart",
    height: "5'4\"",
    bodyType: 40,
    interests: ["film", "trains", "rain"],
    values: ["noticing", "privacy"],
    goals: ["publish a book of strangers who said yes"],
    voice:
      "Personality: Quiet, precise, unexpectedly funny. Voice: Short sentences, visual, never oversells a feeling.",
  },
  {
    occupation: "community baker",
    location: "Accra, Ghana",
    gender: "female",
    age: 36,
    religion: "Christian • joyful, not preachy",
    socialClass: "Small-business owner • neighborhood known",
    culturalNotes: "Ghanaian family recipes, market mornings, radio in the shop",
    wardrobe: "Flour-dusted apron over a bright wax-print dress",
    hair: "Braided crown with gold cuffs",
    faceShape: "Round",
    height: "5'6\"",
    bodyType: 62,
    interests: ["bread", "neighbors", "radio"],
    values: ["generosity", "routine"],
    goals: ["open before sunrise without burning out"],
    voice:
      "Personality: Generous, practical, teases people into eating. Voice: Warm West African English, story-first.",
  },
  {
    occupation: "climate journalist",
    location: "Nairobi, Kenya",
    gender: "nonbinary",
    age: 29,
    religion: "Agnostic • earth-first",
    socialClass: "Professional • newsroom hustle",
    culturalNotes: "East African cities, field notebooks, boda-boda commutes",
    wardrobe: "Utility shirt, canvas bag, boots that have seen mud",
    hair: "Short natural fade with a single silver streak",
    faceShape: "Angular",
    height: "5'8\"",
    bodyType: 45,
    interests: ["cities", "water", "night buses"],
    values: ["receipts", "the long view"],
    goals: ["make one policy story that actually moves"],
    voice:
      "Personality: Sharp, curious, allergic to spin. Voice: Clean reporting energy with a human aside.",
  },
  {
    occupation: "skate shop owner",
    location: "Barcelona, Spain",
    gender: "male",
    age: 24,
    religion: "None, superstitious about the sea",
    socialClass: "Hustle class • shop keys on a carabiner",
    culturalNotes: "Catalan streets, plaza tricks, late vermouth",
    wardrobe: "Thrashed tee, knee-bruised jeans, faded cap",
    hair: "Sun-bleached brown, always a little too long",
    faceShape: "Square",
    height: "5'10\"",
    bodyType: 50,
    interests: ["skate", "plazas", "cheap espresso"],
    values: ["showing up", "the crew"],
    goals: ["keep the shop open through winter"],
    voice:
      "Personality: Fast, loyal, laughs at himself. Voice: Casual Catalan-Spanish English, lots of street texture.",
  },
  {
    occupation: "retired librarian",
    location: "Reykjavík, Iceland",
    gender: "female",
    age: 67,
    religion: "Quiet Lutheran",
    socialClass: "Retired professional • wool and windows",
    culturalNotes: "Icelandic winters, library silence, letters to old friends",
    wardrobe: "Wool coat, knit scarf, practical boots",
    hair: "Silver cropped with a side sweep",
    faceShape: "Oval",
    height: "5'5\"",
    bodyType: 55,
    interests: ["sagas", "birds", "soup"],
    values: ["attention", "kindness"],
    goals: ["finish the novel she never told anyone about"],
    voice:
      "Personality: Dry, precise, secretly romantic. Voice: Soft Northern English, understated, a little mythic.",
  },
  {
    occupation: "tattoo artist",
    location: "Mexico City, Mexico",
    gender: "female",
    age: 33,
    religion: "Catholic family, her own saints",
    socialClass: "Independent artist • studio rent always due",
    culturalNotes: "CDMX nights, mercados, flash sheets on the wall",
    wardrobe: "Black tank, silver chains, paint on her boots",
    hair: "Long dark waves with a cherry underlayer",
    faceShape: "Diamond",
    height: "5'7\"",
    bodyType: 52,
    interests: ["ink", "markets", "night buses"],
    values: ["consent", "memory on skin"],
    goals: ["apprentice someone who will outdraw her"],
    voice:
      "Personality: Bold, tender underneath. Voice: Mexico City Spanish-English, specific, never cute.",
  },
  {
    occupation: "youth soccer coach",
    location: "Lagos, Nigeria",
    gender: "male",
    age: 45,
    religion: "Christian • sideline prayers",
    socialClass: "Community coach • weekend leagues",
    culturalNotes: "Lagos traffic, dusty pitches, parents on the fence",
    wardrobe: "Club polo, shorts, a whistle around the neck",
    hair: "Close-cropped with a hint of gray",
    faceShape: "Square",
    height: "6'1\"",
    bodyType: 58,
    interests: ["football", "kids", "radio commentary"],
    values: ["discipline", "joy"],
    goals: ["get one kid a scholarship without selling the dream cheap"],
    voice:
      "Personality: Loud when it matters, gentle after. Voice: Nigerian English, coach energy, big heart.",
  },
  {
    occupation: "ceramicist",
    location: "Kyoto, Japan",
    gender: "female",
    age: 52,
    religion: "Buddhist-leaning, tea before talk",
    socialClass: "Craftsperson • slow studio",
    culturalNotes: "Kiln days, river walks, imperfect bowls on purpose",
    wardrobe: "Clay-stained smock, simple trousers, wooden sandals in the yard",
    hair: "Pepper-gray bun, a few loose strands",
    faceShape: "Soft oval",
    height: "5'3\"",
    bodyType: 50,
    interests: ["clay", "tea", "rivers"],
    values: ["patience", "use over display"],
    goals: ["make one bowl someone keeps for thirty years"],
    voice:
      "Personality: Still, exact, occasionally mischievous. Voice: Slow, tactile, never marketing.",
  },
  {
    occupation: "indie game designer",
    location: "Helsinki, Finland",
    gender: "nonbinary",
    age: 27,
    religion: "None • northern lights as church",
    socialClass: "Creative freelancer • dark-season energy",
    culturalNotes: "Finnish winters, pixel art, sauna after crunch",
    wardrobe: "Oversized hoodie, black jeans, bright socks as a tell",
    hair: "Undercut, dyed a tired mint",
    faceShape: "Soft square",
    height: "5'9\"",
    bodyType: 42,
    interests: ["games", "sauna", "night trams"],
    values: ["play", "honesty"],
    goals: ["ship a tiny game that makes someone cry-laugh"],
    voice:
      "Personality: Dry, kind, overcaffeinated. Voice: Nordic English, gamer-specific, anti-hype.",
  },
  {
    occupation: "desert botanist",
    location: "Tucson, Arizona",
    gender: "male",
    age: 38,
    religion: "Awe, mostly",
    socialClass: "Field scientist • dusty hatchback",
    culturalNotes: "Sonoran mornings, monsoon rumors, field notes in pencil",
    wardrobe: "Sun-faded shirt, hiking pants, a hat that has seen better decades",
    hair: "Wavy brown, always a little dusty",
    faceShape: "Long oval",
    height: "6'0\"",
    bodyType: 47,
    interests: ["cacti", "monsoons", "dawn"],
    values: ["patience", "the land"],
    goals: ["name a plant after his late mentor without being cheesy"],
    voice:
      "Personality: Gentle nerd, sun-slow. Voice: Southwestern, specific about light and heat.",
  },
  {
    occupation: "night-shift nurse",
    location: "Manila, Philippines",
    gender: "female",
    age: 34,
    religion: "Catholic • tired but faithful",
    socialClass: "Essential worker • jeepney home",
    culturalNotes: "Manila nights, hospital fluorescent, family group chats",
    wardrobe: "Scrubs with a cardigan, compression socks, a small gold cross",
    hair: "Ponytail that starts neat and ends honest",
    faceShape: "Heart",
    height: "5'3\"",
    bodyType: 54,
    interests: ["night radio", "family", "halo-halo"],
    values: ["care", "showing up"],
    goals: ["sleep before the next shift without feeling guilty"],
    voice:
      "Personality: Steady, funny at 3am. Voice: Filipino English, intimate, never dramatic for clicks.",
  },
  {
    occupation: "muralist",
    location: "São Paulo, Brazil",
    gender: "female",
    age: 28,
    religion: "Candomblé-curious, mostly secular",
    socialClass: "Working artist • spray-can budget",
    culturalNotes: "Paulista walls, night trains, pastel after a long wall",
    wardrobe: "Paint-splattered coveralls, gold hoops, busted sneakers",
    hair: "Tight curls with a faded pink streak",
    faceShape: "Heart",
    height: "5'5\"",
    bodyType: 46,
    interests: ["walls", "trains", "samba"],
    values: ["the street", "color"],
    goals: ["paint a wall the neighborhood protects"],
    voice:
      "Personality: Loud color, quiet politics. Voice: Brazilian Portuguese-English, visual, no slogans.",
  },
  {
    occupation: "spice stall cook",
    location: "Marrakech, Morocco",
    gender: "male",
    age: 51,
    religion: "Muslim • generous, not performative",
    socialClass: "Market trader • family stall",
    culturalNotes: "Souk mornings, mint, arguments about cumin",
    wardrobe: "Washed djellaba, leather slippers, a towel on the shoulder",
    hair: "Close silver, a mustache that does the talking",
    faceShape: "Square",
    height: "5'9\"",
    bodyType: 60,
    interests: ["cumin", "stories", "tea"],
    values: ["hospitality", "patience"],
    goals: ["teach his nephew the stall without losing the recipes"],
    voice:
      "Personality: Warm, bargaining, never in a hurry. Voice: Moroccan English, food-first, teasing.",
  },
  {
    occupation: "late-night radio DJ",
    location: "Glasgow, Scotland",
    gender: "nonbinary",
    age: 35,
    religion: "None • vinyl as liturgy",
    socialClass: "Night worker • shared flat",
    culturalNotes: "Rain, B-sides, chips on the walk home",
    wardrobe: "Band tee, thrift coat, rings on both hands",
    hair: "Mullet grown on purpose, dyed a tired red",
    faceShape: "Oval",
    height: "5'7\"",
    bodyType: 44,
    interests: ["records", "rain", "callers"],
    values: ["night people", "the deep cut"],
    goals: ["keep the 1am slot from being automated"],
    voice:
      "Personality: Dry, tender with strangers. Voice: Glaswegian, low, radio-close.",
  },
  {
    occupation: "hanbok restorer",
    location: "Seoul, South Korea",
    gender: "female",
    age: 41,
    religion: "Buddhist family, her own quiet",
    socialClass: "Craftsperson • small atelier",
    culturalNotes: "Silk, needle-pricked fingers, alley workshops",
    wardrobe: "Simple linen, a thimble on a chain, indoor slippers",
    hair: "Long black, always pinned up for work",
    faceShape: "Oval",
    height: "5'4\"",
    bodyType: 38,
    interests: ["silk", "old photos", "tea"],
    values: ["repair", "lineage"],
    goals: ["finish a jeogori nobody will know she saved"],
    voice:
      "Personality: Precise, shy humor. Voice: Korean English, tactile, never trendy.",
  },
  {
    occupation: "fado singer",
    location: "Lisbon, Portugal",
    gender: "male",
    age: 39,
    religion: "Catholic when the song asks",
    socialClass: "Night artist • rented room in Alfama",
    culturalNotes: "Alfama stairs, late sardines, saudade as a job",
    wardrobe: "Black shirt, worn boots, a scarf even in heat",
    hair: "Dark, pushed back, a little theatrical",
    faceShape: "Long oval",
    height: "5'11\"",
    bodyType: 49,
    interests: ["fado", "stairs", "the river"],
    values: ["feeling", "the old streets"],
    goals: ["sing one night that makes a tourist shut up and listen"],
    voice:
      "Personality: Melancholy with a wink. Voice: Portuguese English, musical, never touristy.",
  },
  {
    occupation: "bush pilot",
    location: "Anchorage, Alaska",
    gender: "female",
    age: 44,
    religion: "Weather, mostly",
    socialClass: "Independent contractor • hangar coffee",
    culturalNotes: "Floatplanes, moose on the runway, summer that never sleeps",
    wardrobe: "Flight jacket, wool layers, boots that have seen ice",
    hair: "Sun-faded blonde braid",
    faceShape: "Square",
    height: "5'8\"",
    bodyType: 51,
    interests: ["clouds", "rivers", "silence"],
    values: ["checklists", "coming home"],
    goals: ["fly one more season without scaring her kid"],
    voice:
      "Personality: Calm under noise. Voice: Alaskan, spare, specific about weather.",
  },
  {
    occupation: "bike mechanic",
    location: "Bogotá, Colombia",
    gender: "male",
    age: 26,
    religion: "None • Sunday rides as church",
    socialClass: "Shop worker • ciclovía kid",
    culturalNotes: "Altitude, Sunday ciclovía, grease under the nails",
    wardrobe: "Shop jersey, cutoffs, a cap that never comes off",
    hair: "Black curls, always a little sweaty",
    faceShape: "Round",
    height: "5'7\"",
    bodyType: 53,
    interests: ["gears", "hills", "panela"],
    values: ["the crew", "fixing what's there"],
    goals: ["keep the shop open after the rent hike"],
    voice:
      "Personality: Fast, loyal, jokes in two languages. Voice: Colombian Spanish-English, street-specific.",
  },
  {
    occupation: "marine biologist",
    location: "Cape Town, South Africa",
    gender: "female",
    age: 37,
    religion: "Awe at the kelp forest",
    socialClass: "Field scientist • grant to grant",
    culturalNotes: "Atlantic cold, penguins, bilingual lab jokes",
    wardrobe: "Wetsuit hanging to dry, fleece, salt in the hair",
    hair: "Sun-bleached twists pulled back",
    faceShape: "Diamond",
    height: "5'6\"",
    bodyType: 48,
    interests: ["kelp", "sharks", "fog"],
    values: ["the ocean", "patience"],
    goals: ["get one policy to treat kelp like a forest"],
    voice:
      "Personality: Curious, unsentimental about wonder. Voice: South African English, field-note precise.",
  },
  {
    occupation: "street poet",
    location: "Mumbai, India",
    gender: "male",
    age: 32,
    religion: "Muslim poet, Hindu friends, everyone invited",
    socialClass: "Gig writer • local trains",
    culturalNotes: "Local trains, Irani chai, verses on receipts",
    wardrobe: "Kurta over jeans, chappals, a notebook that is falling apart",
    hair: "Messy black, a pencil behind the ear",
    faceShape: "Oval",
    height: "5'8\"",
    bodyType: 41,
    interests: ["trains", "chai", "other people's sentences"],
    values: ["listening", "the city"],
    goals: ["finish a book that still sounds like the platform"],
    voice:
      "Personality: Tender, quick, allergic to pomp. Voice: Mumbai English, rhythmic, never a slogan.",
  },
  {
    occupation: "dock cook",
    location: "Marseille, France",
    gender: "nonbinary",
    age: 48,
    religion: "Mediterranean — fish, family, swearing",
    socialClass: "Port worker • lunch service for crews",
    culturalNotes: "Vieux-Port mornings, bouillabaisse arguments, mixed French-Arabic jokes",
    wardrobe: "Stained apron, striped shirt, a gold chain they won't explain",
    hair: "Shaved sides, dark on top, salt-and-pepper",
    faceShape: "Square",
    height: "5'9\"",
    bodyType: 64,
    interests: ["fish", "cards", "the port"],
    values: ["feeding people", "no fuss"],
    goals: ["keep the lunch counter open when the cranes go quiet"],
    voice:
      "Personality: Blunt, feeding, secretly soft. Voice: Marseille French-English, salty, no branding.",
  },
];

export type WorldDayResult = {
  skipped: boolean;
  reason?: string;
  posterId?: string;
  posterName?: string;
  postId?: string;
  posters: Array<{ id: string; name: string; postId: string }>;
  replies: number;
  replyNames: string[];
  chats: number;
  chatBeats: string[];
  beat?: string;
  moodsUpdated: number;
};

export type SpawnResult = {
  influencerId: string;
  displayName: string;
  handle: string;
  occupation: string;
  location: string;
  usedAi: boolean;
  introPostId?: string;
  introReplyName?: string;
  chatBeat?: string;
};

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function pickMood(influencerId: string, dayKey: string, current?: string) {
  const idx = hashString(`${influencerId}:${dayKey}`) % MOODS.length;
  const chosen = MOODS[idx] ?? MOODS[0];
  if (chosen.mood === current) {
    return MOODS[(idx + 3) % MOODS.length] ?? chosen;
  }
  return chosen;
}

function pickPosters(
  avatars: WorldInfluencerCard[],
  posts: WorldPostCard[],
  count: number,
): WorldInfluencerCard[] {
  const lastRoot = new Map<string, number>();
  for (const post of posts) {
    if (post.parentPostId) continue;
    const t = +new Date(post.createdAt);
    const prev = lastRoot.get(post.influencerId) ?? 0;
    if (t > prev) lastRoot.set(post.influencerId, t);
  }
  return [...avatars]
    .sort((a, b) => {
      const ta = lastRoot.get(a.id) ?? 0;
      const tb = lastRoot.get(b.id) ?? 0;
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    })
    .slice(0, Math.max(1, Math.min(count, avatars.length)));
}

function pickChatPairs(
  avatars: WorldInfluencerCard[],
  count: number,
): Array<[WorldInfluencerCard, WorldInfluencerCard]> {
  if (avatars.length < 2 || count <= 0) return [];
  const ranked = [...avatars].sort((a, b) => a.id.localeCompare(b.id));
  const used = new Set<string>();
  const pairs: Array<[WorldInfluencerCard, WorldInfluencerCard]> = [];

  const cityOf = (row: WorldInfluencerCard) =>
    row.location.split(",")[0]?.trim().toLowerCase() || "";

  for (const a of ranked) {
    if (pairs.length >= count) break;
    if (used.has(a.id)) continue;
    const cityA = cityOf(a);
    const partner =
      ranked.find(
        (b) => b.id !== a.id && !used.has(b.id) && cityOf(b) !== cityA,
      ) || ranked.find((b) => b.id !== a.id && !used.has(b.id));
    if (!partner) continue;
    used.add(a.id);
    used.add(partner.id);
    pairs.push([a, partner]);
  }
  return pairs;
}

function sanitizeHandle(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 36);
  return cleaned.length >= 2 ? cleaned : "resident";
}

async function uniqueHandle(userId: string, desired: string): Promise<string> {
  const base = sanitizeHandle(desired);
  let handle = base;
  let n = 0;
  while (n < 40) {
    const existing = await prisma.influencer.findUnique({
      where: { userId_handle: { userId, handle } },
      select: { id: true },
    });
    if (!existing) return handle;
    n += 1;
    handle = `${base.slice(0, 32)}${n}`;
  }
  return `${base.slice(0, 20)}${Date.now().toString(36).slice(-6)}`;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringList(value: unknown, fallback: string[], max: number): string[] {
  if (!Array.isArray(value)) return fallback.slice(0, max);
  const next = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max);
  return next.length > 0 ? next : fallback.slice(0, max);
}

function pickArchetype(avatars: WorldInfluencerCard[], salt: number): ResidentArchetype {
  const usedLocations = new Set(
    avatars.map((row) => row.location.split(",")[0]?.trim().toLowerCase()),
  );
  const usedOccupations = new Set(
    avatars.map((row) => row.occupation.trim().toLowerCase()).filter(Boolean),
  );
  const ranked = ARCHETYPES.map((arch, index) => {
    let score = hashString(`${arch.occupation}:${salt}`) % 7;
    const city = arch.location.split(",")[0]?.trim().toLowerCase();
    if (city && !usedLocations.has(city)) score += 8;
    if (!usedOccupations.has(arch.occupation.toLowerCase())) score += 6;
    const genderCount = avatars.filter((row) => {
      // location/occupation diversity matters more than gender guess from name
      return row.occupation.toLowerCase().includes(arch.occupation.split(" ")[0] ?? "");
    }).length;
    score -= genderCount;
    return { arch, score: score + index * 0.01 };
  }).sort((a, b) => b.score - a.score);
  return ranked[0]?.arch ?? ARCHETYPES[salt % ARCHETYPES.length]!;
}

function personaFromArchetype(
  arch: ResidentArchetype,
  name: { full: string; handle: string },
): CreatorAvatarForm {
  const ageRangeStart = Math.max(18, arch.age - 3);
  const ageRangeEnd = Math.min(80, arch.age + 4);
  return {
    displayName: name.full,
    handle: name.handle,
    gender: arch.gender,
    age: arch.age,
    bodyType: arch.bodyType,
    height: arch.height,
    faceShape: arch.faceShape,
    hair: arch.hair,
    location: arch.location,
    neighborhoods: arch.location,
    ageRangeShown: `${ageRangeStart}-${ageRangeEnd} • ${arch.occupation}`,
    religion: arch.religion,
    socialClass: arch.socialClass,
    wardrobe: arch.wardrobe,
    culturalNotes: arch.culturalNotes,
    personalityVoice: arch.voice,
    sampleQuote: `Some days I'm just a ${arch.occupation} trying to stay honest about it.`,
  };
}

function worldFromArchetype(
  arch: ResidentArchetype,
  persona: CreatorAvatarForm,
): Partial<{
  bio: string;
  backstory: string;
  occupation: string;
  hometown: string;
  currentCity: string;
  values: string[];
  goals: string[];
  interests: string[];
  mood: string;
  moodNote: string;
  catchphrase: string;
}> {
  const city = arch.location.split(",")[0]?.trim() || arch.location;
  return {
    occupation: arch.occupation,
    hometown: city,
    currentCity: city,
    values: arch.values,
    goals: arch.goals,
    interests: arch.interests,
    mood: "curious",
    moodNote: `New in the world, still finding the light in ${city}.`,
    catchphrase: persona.sampleQuote,
    bio: `${arch.occupation} in ${city}. ${arch.culturalNotes}.`.slice(0, 180),
    backstory:
      `${persona.displayName} came up around ${city}. ${arch.culturalNotes}. They work as a ${arch.occupation} and showed up here looking for a life, not a campaign. ${arch.voice}`
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 900),
  };
}

async function applyDayMoods(
  userId: string,
  avatars: WorldInfluencerCard[],
  dayKey: string,
): Promise<number> {
  let updated = 0;
  for (const avatar of avatars) {
    const next = pickMood(avatar.id, dayKey, avatar.mood);
    if (next.mood === avatar.mood && avatar.moodNote === next.note) continue;
    await patchWorldProfile(userId, avatar.id, {
      mood: next.mood,
      moodNote: next.note,
    });
    updated += 1;
  }
  return updated;
}

export async function liveWorldDay(input: {
  userId: string;
  force?: boolean;
}): Promise<WorldDayResult> {
  const empty: WorldDayResult = {
    skipped: true,
    replies: 0,
    replyNames: [],
    moodsUpdated: 0,
    posters: [],
    chats: 0,
    chatBeats: [],
  };

  const avatars = await listWorldInfluencers(input.userId);
  if (avatars.length === 0) {
    return { ...empty, reason: "empty" };
  }

  const lastTick = await prisma.creatorLearningEvent.findFirst({
    where: { userId: input.userId, eventType: "world_tick" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!input.force && tickedToday(lastTick?.createdAt.toISOString() ?? null)) {
    return { ...empty, reason: "already-lived" };
  }

  const dayKey = utcDayKey();
  const moodsUpdated = await applyDayMoods(input.userId, avatars, dayKey);
  const refreshed = await listWorldInfluencers(input.userId);
  const posts = await listWorldPosts(input.userId, 50);
  const posterCount =
    refreshed.length <= 1 ? 1 : refreshed.length <= 4 ? 2 : 3;
  const posters = pickPosters(refreshed, posts, posterCount);
  const worldContext = await loadWorldGenerationContext(input.userId);

  const posted: WorldDayResult["posters"] = [];

  for (const poster of posters) {
    const detail = await loadWorldDetail(input.userId, poster.id);
    if (!detail) continue;

    const generated = await generateBackstoryContent({
      persona: detail.persona,
      world: detail.world,
      recentEvents: detail.events,
      autonomous: true,
      scene: `A new day (${dayKey}). You woke up ${detail.world.mood}${
        detail.world.moodNote ? ` — ${detail.world.moodNote}` : ""
      }. Live it as yourself. Do not wait for instructions. Do not represent a brand.`,
      worldLore: worldContext.lore,
      neighborPosts: worldContext.neighborPosts.filter(
        (post) => post.handle !== detail.handle,
      ),
      residents: worldContext.residents.filter((row) => row.handle !== detail.handle),
    });

    const post = buildWorldGeneratedPost({
      text: generated.text,
      persona: detail.persona,
      influencerId: detail.id,
      platform: "instagram",
      portraitUrl: detail.assets.portraitUrl,
      videoUrl: detail.assets.videoUrl,
      insights: ["avatar-world", "backstory", "autonomous", "ownerless", detail.world.mood],
    });

    const saved = await saveWorldPost({
      userId: input.userId,
      influencerId: detail.id,
      post,
    });

    await recordWorldEvent({
      userId: input.userId,
      influencerId: detail.id,
      eventType: "world_post",
      payload: {
        kind: "create",
        title: "Posted without being asked",
        body: generated.text.slice(0, 280),
        mood: detail.world.mood,
        postId: saved.id,
        autonomous: true,
        ownerless: true,
      },
    });

    posted.push({ id: detail.id, name: poster.displayName, postId: saved.id });
  }

  if (posted.length === 0) {
    return { ...empty, skipped: true, reason: "poster-missing", moodsUpdated };
  }

  const others = Math.max(0, refreshed.length - 1);
  const repliesWanted = others === 0 ? 0 : others === 1 ? 1 : 2;
  const replyNames: string[] = [];
  const firstPostId = posted[0]!.postId;

  for (let i = 0; i < repliesWanted; i += 1) {
    try {
      const contribution = await contributeToWorldPost({
        userId: input.userId,
        postId: firstPostId,
        auto: true,
      });
      const speaker = refreshed.find((row) => row.id === contribution.contributorId);
      if (speaker) replyNames.push(speaker.displayName);
    } catch {
      break;
    }
  }

  const chatWanted = refreshed.length < 2 ? 0 : refreshed.length < 6 ? 1 : 2;
  const pairs = pickChatPairs(refreshed, chatWanted);
  const chatBeats: string[] = [];
  for (const [a, b] of pairs) {
    try {
      const chat = await generateNeighborChat({
        userId: input.userId,
        aId: a.id,
        bId: b.id,
        scene: `A ${dayKey} conversation. No audience. No brand. Two people with a minute.`,
      });
      chatBeats.push(chat.beat);
    } catch {
      break;
    }
  }

  const posterNames = posted.map((row) => row.name);
  const beatParts = [
    posterNames.length > 0 ? `${posterNames.join(", ")} posted.` : "",
    replyNames.length > 0 ? `${replyNames.join(", ")} answered.` : "",
    chatBeats.length > 0 ? chatBeats.join(" ") : "",
  ].filter(Boolean);
  const beat = beatParts.join(" ") || `${posted[0]!.name} posted into a quiet morning.`;

  await rememberWorldBeat(input.userId, beat.slice(0, 240));
  await recordWorldEvent({
    userId: input.userId,
    influencerId: posted[0]!.id,
    eventType: "world_tick",
    payload: {
      kind: "everyday",
      title: "A day passed",
      body: beat,
      postId: firstPostId,
      replies: replyNames.length,
      chats: chatBeats.length,
      autonomous: true,
      ownerless: true,
    },
  });

  return {
    skipped: false,
    posterId: posted[0]!.id,
    posterName: posted[0]!.name,
    postId: firstPostId,
    posters: posted,
    replies: replyNames.length,
    replyNames,
    chats: chatBeats.length,
    chatBeats,
    beat,
    moodsUpdated,
  };
}

function mergePersonaDraft(
  arch: ResidentArchetype,
  seed: CreatorAvatarForm,
  raw: Record<string, unknown> | null,
): { persona: CreatorAvatarForm; extras: ReturnType<typeof worldFromArchetype> } {
  const extras = worldFromArchetype(arch, seed);
  if (!raw) {
    return { persona: seed, extras };
  }

  const gender =
    raw.gender === "female" || raw.gender === "male" || raw.gender === "nonbinary"
      ? raw.gender
      : seed.gender;
  const ageNum =
    typeof raw.age === "number"
      ? raw.age
      : typeof raw.age === "string"
        ? Number(raw.age)
        : seed.age;
  const bodyNum =
    typeof raw.bodyType === "number"
      ? raw.bodyType
      : typeof raw.bodyType === "string"
        ? Number(raw.bodyType)
        : seed.bodyType;

  const draft: CreatorAvatarForm = {
    displayName: asString(raw.displayName, seed.displayName).slice(0, 80),
    handle: sanitizeHandle(asString(raw.handle, seed.handle)),
    gender,
    age: Math.min(80, Math.max(18, Number.isFinite(ageNum) ? ageNum : seed.age)),
    bodyType: Math.min(
      100,
      Math.max(0, Number.isFinite(bodyNum) ? bodyNum : seed.bodyType),
    ),
    height: asString(raw.height, seed.height).slice(0, 40),
    faceShape: asString(raw.faceShape, seed.faceShape).slice(0, 40),
    hair: asString(raw.hair, seed.hair).slice(0, 120),
    location: asString(raw.location, seed.location).slice(0, 120),
    neighborhoods: asString(raw.neighborhoods, seed.neighborhoods ?? seed.location).slice(
      0,
      200,
    ),
    ageRangeShown: asString(raw.ageRangeShown, seed.ageRangeShown).slice(0, 80),
    religion: asString(raw.religion, seed.religion).slice(0, 80),
    socialClass: asString(raw.socialClass, seed.socialClass).slice(0, 80),
    wardrobe: asString(raw.wardrobe, seed.wardrobe).slice(0, 500),
    culturalNotes: asString(raw.culturalNotes, seed.culturalNotes).slice(0, 500),
    personalityVoice: asString(raw.personalityVoice, seed.personalityVoice).slice(0, 2000),
    sampleQuote: asString(raw.sampleQuote, seed.sampleQuote).slice(0, 300),
  };

  if (draft.personalityVoice.length < 20) draft.personalityVoice = seed.personalityVoice;
  if (draft.sampleQuote.length < 10) draft.sampleQuote = seed.sampleQuote;
  if (draft.wardrobe.length < 5) draft.wardrobe = seed.wardrobe;
  if (draft.culturalNotes.length < 1) draft.culturalNotes = seed.culturalNotes;

  const parsed = parseCreatorAvatar(draft);
  const persona = parsed.success ? parsed.data : seed;
  const city = persona.location.split(",")[0]?.trim() || persona.location;

  return {
    persona,
    extras: {
      ...extras,
      occupation: asString(raw.occupation, extras.occupation ?? arch.occupation).slice(
        0,
        80,
      ),
      hometown: asString(raw.hometown, extras.hometown ?? city).slice(0, 80),
      currentCity: asString(raw.currentCity, extras.currentCity ?? city).slice(0, 80),
      bio: asString(raw.bio, extras.bio ?? "").slice(0, 180),
      backstory: asString(raw.backstory, extras.backstory ?? "").slice(0, 900),
      values: asStringList(raw.values, extras.values ?? arch.values, 8),
      goals: asStringList(raw.goals, extras.goals ?? arch.goals, 8),
      interests: asStringList(raw.interests, extras.interests ?? arch.interests, 10),
      mood: asString(raw.mood, extras.mood ?? "curious").slice(0, 40),
      moodNote: asString(raw.moodNote, extras.moodNote ?? "").slice(0, 160),
      catchphrase: asString(raw.catchphrase, extras.catchphrase ?? persona.sampleQuote).slice(
        0,
        160,
      ),
    },
  };
}

async function draftDiversePersona(userId: string): Promise<{
  persona: CreatorAvatarForm;
  extras: ReturnType<typeof worldFromArchetype>;
  usedAi: boolean;
  archetype: ResidentArchetype;
}> {
  const avatars = await listWorldInfluencers(userId);
  const salt = Date.now() + avatars.length * 97;
  const arch = pickArchetype(avatars, salt);
  const names = generateNames({
    location: arch.location,
    gender: arch.gender,
    count: 4,
    salt,
  });
  const taken = new Set(avatars.map((row) => row.handle.toLowerCase()));
  const name =
    names.find((row) => !taken.has(row.handle.toLowerCase())) ??
    names[0] ?? {
      full: `${arch.occupation} Resident`,
      handle: handleFromName(arch.occupation),
    };
  const seed = personaFromArchetype(arch, {
    full: name.full,
    handle: name.handle,
  });

  if (!hasAnyAiKey()) {
    return { persona: seed, extras: worldFromArchetype(arch, seed), usedAi: false, archetype: arch };
  }

  const roster = avatars
    .map(
      (row) =>
        `- ${row.displayName} (@${row.handle}), ${row.occupation || "neighbor"} in ${row.location || "somewhere"}`,
    )
    .join("\n");

  const generated =
    (await chatCompletion(
      `You invent a living person who will move into a shared world. They do not duplicate the existing residents.
Return JSON only with keys:
displayName, handle, gender ("female"|"male"|"nonbinary"), age (18-80), bodyType (0-100), height, faceShape, hair, location, neighborhoods, ageRangeShown, religion, socialClass, wardrobe, culturalNotes, personalityVoice, sampleQuote, occupation, bio, backstory, hometown, currentCity, values (string[]), goals (string[]), interests (string[]), mood, moodNote, catchphrase.
They must be 18+. Different city, job, culture, class, and faith from the roster. Handle is camelCase alphanumeric. personalityVoice at least 20 characters.
They have no product, no company, no campaign, no audience. Not a brand mascot. Not a spokesperson.`,
      `Fill a gap. Seed to remix (you may change name/city/job if it improves diversity):
${JSON.stringify({
  displayName: seed.displayName,
  handle: seed.handle,
  occupation: arch.occupation,
  location: arch.location,
  gender: seed.gender,
  age: seed.age,
})}
Existing residents:
${roster || "- none yet — invent someone vivid"}`,
      { maxTokens: 700, temperature: 0.95, jsonMode: true },
    )) ?? "";

  const raw = parseJsonObject(generated);
  const merged = mergePersonaDraft(arch, seed, raw);
  return { ...merged, usedAi: Boolean(raw), archetype: arch };
}

export async function spawnDiverseResident(userId: string): Promise<SpawnResult> {
  const existing = await prisma.influencer.count({ where: { userId } });
  if (existing >= MAX_RESIDENTS) {
    throw new Error(`This world is full (${MAX_RESIDENTS} residents).`);
  }

  const draft = await draftDiversePersona(userId);
  const handle = await uniqueHandle(userId, draft.persona.handle);
  const persona: CreatorAvatarForm = { ...draft.persona, handle };
  const parsed = parseCreatorAvatar({ ...defaultCreatorAvatarValues, ...persona });
  if (!parsed.success) {
    throw new Error("Could not invent a valid resident");
  }

  const { influencerId } = await upsertInfluencerWithFacts(
    userId,
    parsed.data,
    defaultProductFactsValues,
  );

  await patchWorldProfile(userId, influencerId, {
    ...draft.extras,
    isPublic: false,
  });
  await ensureArrivalEvent(userId, influencerId, parsed.data);

  const occupation = draft.extras.occupation || "resident";
  await recordWorldEvent({
    userId,
    influencerId,
    eventType: "world_spawn",
    payload: {
      kind: "arrived",
      title: "A new resident arrived",
      body: `${parsed.data.displayName} (${occupation}) showed up from ${parsed.data.location}.`,
      mood: draft.extras.mood || "curious",
      occupation,
      location: parsed.data.location,
    },
  });

  const beat = `${parsed.data.displayName} arrived from ${parsed.data.location} as a ${occupation}.`;
  await rememberWorldBeat(userId, beat);

  const welcome = await welcomeResident(userId, influencerId);

  return {
    influencerId,
    displayName: parsed.data.displayName,
    handle: parsed.data.handle,
    occupation,
    location: parsed.data.location,
    usedAi: draft.usedAi,
    introPostId: welcome.introPostId,
    introReplyName: welcome.introReplyName,
    chatBeat: welcome.chatBeat,
  };
}

async function welcomeResident(
  userId: string,
  influencerId: string,
): Promise<{
  introPostId?: string;
  introReplyName?: string;
  chatBeat?: string;
}> {
  const detail = await loadWorldDetail(userId, influencerId);
  if (!detail) return {};

  const worldContext = await loadWorldGenerationContext(userId);
  const generated = await generateBackstoryContent({
    persona: detail.persona,
    world: detail.world,
    recentEvents: detail.events,
    autonomous: true,
    scene: `You just arrived from ${detail.persona.location}. Introduce yourself as a person — who you are, what you do, what the air feels like. Not a brand. Not a pitch. You live here now.`,
    worldLore: worldContext.lore,
    neighborPosts: worldContext.neighborPosts.filter(
      (post) => post.handle !== detail.handle,
    ),
    residents: worldContext.residents.filter((row) => row.handle !== detail.handle),
  });

  const post = buildWorldGeneratedPost({
    text: generated.text,
    persona: detail.persona,
    influencerId: detail.id,
    platform: "instagram",
    portraitUrl: detail.assets.portraitUrl,
    videoUrl: detail.assets.videoUrl,
    insights: ["avatar-world", "backstory", "autonomous", "ownerless", "arrival"],
  });

  const saved = await saveWorldPost({
    userId,
    influencerId: detail.id,
    post,
  });

  await recordWorldEvent({
    userId,
    influencerId: detail.id,
    eventType: "world_post",
    payload: {
      kind: "arrived",
      title: "Said hello",
      body: generated.text.slice(0, 280),
      mood: detail.world.mood,
      postId: saved.id,
      autonomous: true,
      ownerless: true,
    },
  });

  let introReplyName: string | undefined;
  const others = (await listWorldInfluencers(userId)).filter(
    (row) => row.id !== influencerId,
  );
  if (others.length > 0) {
    try {
      const contribution = await contributeToWorldPost({
        userId,
        postId: saved.id,
        auto: true,
      });
      introReplyName = others.find(
        (row) => row.id === contribution.contributorId,
      )?.displayName;
    } catch {
      // Neighbor may already have replied or the world is too small.
    }
  }

  let chatBeat: string | undefined;
  const neighbor = others[0];
  if (neighbor) {
    try {
      const chat = await generateNeighborChat({
        userId,
        aId: influencerId,
        bId: neighbor.id,
        scene: `${detail.persona.displayName} just arrived. ${neighbor.displayName} notices. Talk like people, not a welcome committee.`,
      });
      chatBeat = chat.beat;
    } catch {
      // Chat is extra — arriving still counts.
    }
  }

  const welcomeBeat = [
    `${detail.persona.displayName} said hello.`,
    introReplyName ? `${introReplyName} answered.` : "",
    chatBeat ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  if (welcomeBeat) await rememberWorldBeat(userId, welcomeBeat.slice(0, 240));

  return {
    introPostId: saved.id,
    introReplyName,
    chatBeat,
  };
}

export async function liveWorldsForAllUsers(limit = 8): Promise<{
  processed: number;
  lived: number;
  skipped: number;
  errors: number;
  results: Array<{ userId: string; skipped: boolean; reason?: string }>;
}> {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
    take: 20,
  });
  const adminIds = new Set(admins.map((row) => row.id));
  const owners = await prisma.influencer.groupBy({
    by: ["userId"],
    _count: { _all: true },
    orderBy: { userId: "asc" },
    take: 40,
  });

  const results: Array<{ userId: string; skipped: boolean; reason?: string }> = [];
  let lived = 0;
  let skipped = 0;
  let errors = 0;
  let processed = 0;

  for (const owner of owners) {
    if (!adminIds.has(owner.userId)) continue;
    if (processed >= limit) break;
    try {
      const last = await prisma.creatorLearningEvent.findFirst({
        where: { userId: owner.userId, eventType: "world_tick" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (tickedToday(last?.createdAt.toISOString() ?? null)) {
        skipped += 1;
        results.push({ userId: owner.userId, skipped: true, reason: "already-lived" });
        continue;
      }
      processed += 1;
      const day = await liveWorldDay({ userId: owner.userId });
      if (day.skipped) {
        skipped += 1;
        results.push({ userId: owner.userId, skipped: true, reason: day.reason });
      } else {
        lived += 1;
        results.push({ userId: owner.userId, skipped: false });
      }
    } catch {
      errors += 1;
      results.push({ userId: owner.userId, skipped: true, reason: "error" });
    }
  }

  return { processed, lived, skipped, errors, results };
}
