import { chatCompletion, hasAnyAiKey } from "@/lib/ai-client";
import {
  generateImageFromPrompt,
  getImageProviderAvailability,
} from "@/lib/ai-image";
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
  growWorldBonds,
  type WorldInfluencerCard,
  type WorldPostCard,
} from "./avatar-world";
import { generateNames, handleFromName } from "./avatar-name-generator";
import { buildAvatarImagePrompt } from "./avatar-prompts";
import { savePortraitRender } from "./influencer-renders";
import { upsertInfluencerWithFacts } from "./learning";
import {
  ensureResidentAccount,
  jobForOccupation,
  JOB_TITLES,
  missingTownJobs,
  runEconomyDay,
  seedEssentialListings,
  SOCIAL_HANGOUTS,
  streetForOccupation,
  type EconomyDayResult,
} from "./world-economy";

const MAX_RESIDENTS = 40;
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
  {
    occupation: "grocer",
    location: "Addis Ababa, Ethiopia",
    gender: "female",
    age: 46,
    religion: "Orthodox • feast days and ordinary Tuesdays",
    socialClass: "Shopkeeper • family counter",
    culturalNotes: "Injera stacked, coffee ceremony after close, cousins who still ask for credit",
    wardrobe: "Printed dress, cardigan, a pencil in the hair",
    hair: "Tight coils wrapped for work, a gold earring that never comes off",
    faceShape: "Round",
    height: "5'5\"",
    bodyType: 63,
    interests: ["coffee", "neighbors", "ledgers"],
    values: ["feeding people", "accounts that balance"],
    goals: ["keep the shop open when the street goes quiet"],
    voice:
      "Personality: Brisk, generous, remembers every debt. Voice: Ethiopian English, counter-close, never a pitch.",
  },
  {
    occupation: "landlord",
    location: "Chicago, Illinois",
    gender: "male",
    age: 58,
    religion: "Baptist when his sister drags him",
    socialClass: "Small property • keys on a ring",
    culturalNotes: "South Side rooms, radiators that bang, tenants who became family anyway",
    wardrobe: "Work jacket, pressed shirt, boots he won't throw away",
    hair: "Gray fade, a mustache kept neat",
    faceShape: "Square",
    height: "5'11\"",
    bodyType: 61,
    interests: ["keys", "ball games", "soup"],
    values: ["the building", "being fair when he can"],
    goals: ["fix the stairs before winter without raising rent twice"],
    voice:
      "Personality: Dry, stubborn, softer than he sounds. Voice: Chicago, unhurried, talks like a lease and a story.",
  },
  {
    occupation: "bank teller",
    location: "Singapore",
    gender: "female",
    age: 29,
    religion: "Buddhist family, numbers as meditation",
    socialClass: "Clerk • bus then counter",
    culturalNotes: "Hawker dinners, humid commutes, counting Sparks until the drawer is honest",
    wardrobe: "Crisp blouse, navy slacks, a small jade pendant",
    hair: "Black, low bun, not a strand for the camera",
    faceShape: "Oval",
    height: "5'4\"",
    bodyType: 39,
    interests: ["ledgers", "hawker food", "quiet trains"],
    values: ["accuracy", "not making a scene"],
    goals: ["close every drawer without a missing Spark"],
    voice:
      "Personality: Precise, kind in the margins. Voice: Singaporean English, even, never salesy.",
  },
  {
    occupation: "bus driver",
    location: "Cairo, Egypt",
    gender: "male",
    age: 53,
    religion: "Muslim • radio Qur'an at dawn, traffic after",
    socialClass: "City worker • route 14 for twenty years",
    culturalNotes: "Nile haze, honking as language, tea in a plastic cup on the dash",
    wardrobe: "Company shirt, worn trousers, sunglasses that have seen better decades",
    hair: "Salt-and-pepper, receding, a cap when the sun is mean",
    faceShape: "Long oval",
    height: "5'10\"",
    bodyType: 59,
    interests: ["routes", "tea", "the river"],
    values: ["getting people home", "patience in traffic"],
    goals: ["finish the shift without a fight and still make Maghrib"],
    voice:
      "Personality: Patient, joking, never rushed by a passenger. Voice: Cairene English, street-level, no branding.",
  },
  {
    occupation: "fishing guide",
    location: "Duluth, Minnesota",
    gender: "female",
    age: 39,
    religion: "The lake, mostly",
    socialClass: "Seasonal guide • cash in the glove box",
    culturalNotes: "Superior cold, rented rods, stories that get bigger after dark",
    wardrobe: "Waxed jacket, waders hanging to dry, a hat that has seen weather",
    hair: "Sun-faded brown, always in a knot",
    faceShape: "Oval",
    height: "5'7\"",
    bodyType: 52,
    interests: ["walleye", "quiet water", "thermos coffee"],
    values: ["coming back in", "not scaring the fish"],
    goals: ["keep the dock open one more season"],
    voice:
      "Personality: Dry, unhurried, notices the weather first. Voice: Upper Midwest, low, never a pitch.",
  },
  {
    occupation: "park ranger",
    location: "Denver, Colorado",
    gender: "male",
    age: 44,
    religion: "Trails as church",
    socialClass: "City parks • keys to a shed",
    culturalNotes: "Oak benches, kids' soccer, a map he folded wrong on purpose",
    wardrobe: "Khaki shirt, scuffed boots, a radio on the belt",
    hair: "Short black, a little gray at the temples",
    faceShape: "Square",
    height: "6'0\"",
    bodyType: 56,
    interests: ["oaks", "shortcuts", "quiet lawns"],
    values: ["the green staying open", "not making a scene"],
    goals: ["keep the benches from rotting through winter"],
    voice:
      "Personality: Steady, a little shy, good at sitting with people. Voice: High plains, even, specific about trees.",
  },
  {
    occupation: "bartender",
    location: "Brooklyn, New York",
    gender: "female",
    age: 36,
    religion: "Last call as liturgy",
    socialClass: "Service • tips in a cup",
    culturalNotes: "Sticky rail, regulars who never say their jobs, one more then home",
    wardrobe: "Black shirt, rolled sleeves, a gold chain she forgets she's wearing",
    hair: "Dark curls pinned up for the shift",
    faceShape: "Heart",
    height: "5'5\"",
    bodyType: 49,
    interests: ["ice", "other people's nights", "the walk home"],
    values: ["listening", "not asking twice"],
    goals: ["close without a fight and still catch the train"],
    voice:
      "Personality: Fast, kind in the margins, remembers the usual. Voice: Brooklyn, dry, never a brand.",
  },
  {
    occupation: "rec hall host",
    location: "Detroit, Michigan",
    gender: "male",
    age: 27,
    religion: "The scoreboard, loosely",
    socialClass: "Rec league • chalk on the fingers",
    culturalNotes: "Darts, a scuffed table, someone always keeping score wrong",
    wardrobe: "Team tee, joggers, a whistle he rarely uses",
    hair: "A fade with a hard part",
    faceShape: "Round",
    height: "5'10\"",
    bodyType: 58,
    interests: ["darts", "pickup", "the radio in the corner"],
    values: ["everybody plays", "no sore winners"],
    goals: ["keep the lights on until somebody wins fair"],
    voice:
      "Personality: Loud then gentle. Voice: Detroit, teasing, never a slogan.",
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
  wages?: number;
  listings?: number;
  sales?: number;
  rents?: number;
  groceries?: number;
  hangout?: { place: string; names: string[] };
  growth?: string[];
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
  balance?: number;
  wage?: number;
  portraitUrl?: string;
};

export type QuickCreateHint = {
  name?: string;
  occupation?: string;
  location?: string;
  gender?: CreatorAvatarForm["gender"];
  vibe?: string;
  welcome?: boolean;
  skipAi?: boolean;
  withFace?: boolean;
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
  economy?: EconomyDayResult,
  skip?: Set<string>,
): Array<[WorldInfluencerCard, WorldInfluencerCard]> {
  if (avatars.length < 2 || count <= 0) return [];
  const used = new Set<string>(skip);
  const pairs: Array<[WorldInfluencerCard, WorldInfluencerCard]> = [];

  const scorePair = (a: WorldInfluencerCard, b: WorldInfluencerCard): number => {
    let score = hashString(`${a.id}:${b.id}`) % 4;
    if (a.partnerId && a.partnerId === b.id) score += 14;
    if (a.relationshipIds.includes(b.id) || b.relationshipIds.includes(a.id)) {
      score += 8;
    }
    if (a.street && b.street && a.street === b.street) score += 4;
    if (economy?.landlordId === a.id && economy.rentPayers.includes(b.id)) score += 6;
    if (economy?.landlordId === b.id && economy.rentPayers.includes(a.id)) score += 6;
    if (economy?.grocerId === a.id && economy.groceryBuyers.includes(b.id)) score += 6;
    if (economy?.grocerId === b.id && economy.groceryBuyers.includes(a.id)) score += 6;
    if (
      economy?.salePairs.some(
        (row) =>
          (row.buyerId === a.id && row.sellerId === b.id) ||
          (row.buyerId === b.id && row.sellerId === a.id),
      )
    ) {
      score += 5;
    }
    return score;
  };

  const candidates: Array<{
    a: WorldInfluencerCard;
    b: WorldInfluencerCard;
    score: number;
  }> = [];
  for (let i = 0; i < avatars.length; i += 1) {
    for (let j = i + 1; j < avatars.length; j += 1) {
      const a = avatars[i]!;
      const b = avatars[j]!;
      candidates.push({ a, b, score: scorePair(a, b) });
    }
  }
  candidates.sort((left, right) => right.score - left.score);

  for (const candidate of candidates) {
    if (pairs.length >= count) break;
    if (used.has(candidate.a.id) || used.has(candidate.b.id)) continue;
    used.add(candidate.a.id);
    used.add(candidate.b.id);
    pairs.push([candidate.a, candidate.b]);
  }
  return pairs;
}

type SocialHangout = (typeof SOCIAL_HANGOUTS)[number];

function pickActivity(
  social: SocialHangout,
  dayKey: string,
  speakers: WorldInfluencerCard[],
): { line: string; beat: string } {
  const acts = social.activities.length > 0 ? social.activities : [social.scene];
  const line = acts[hashString(`${dayKey}:${social.id}:act`) % acts.length]!;
  if (social.id !== "games" || speakers.length < 2) {
    return { line, beat: line };
  }
  const winner =
    speakers[hashString(`${dayKey}:${social.id}:win`) % speakers.length]!;
  const loser = speakers.find((row) => row.id !== winner.id) ?? speakers[0]!;
  return {
    line,
    beat: `${winner.displayName} took it from ${loser.displayName}. Close enough to argue.`,
  };
}

function pickHangoutSeed(
  social: SocialHangout,
  unused: WorldInfluencerCard[],
  dayKey: string,
): WorldInfluencerCard | undefined {
  if (unused.length === 0) return undefined;
  const locals = unused.filter((row) => row.street === social.street);
  if (social.id === "lake" || social.id === "park") {
    const couple = unused.find(
      (row) =>
        row.partnerId && unused.some((other) => other.id === row.partnerId),
    );
    if (couple) return couple;
    const family = unused.find((row) =>
      unused.some(
        (other) =>
          other.id !== row.id &&
          (row.familyNames.includes(other.displayName) ||
            other.familyNames.includes(row.displayName)),
      ),
    );
    if (family) return family;
  }
  if (social.id === "bar" || social.id === "games") {
    const buddy = unused.find(
      (row) =>
        unused.some(
          (other) =>
            other.id !== row.id &&
            (row.relationshipIds.includes(other.id) ||
              other.relationshipIds.includes(row.id)),
        ),
    );
    if (buddy) return buddy;
  }
  return (
    locals[hashString(`${dayKey}:${social.id}`) % Math.max(1, locals.length)] ??
    unused[hashString(`${dayKey}:${social.id}:crowd`) % unused.length]
  );
}

function pickHangouts(
  avatars: WorldInfluencerCard[],
  dayKey: string,
): Array<{ place: { id: string; name: string }; speakers: WorldInfluencerCard[] }> {
  if (avatars.length < 2) return [];
  const byId = new Map(avatars.map((row) => [row.id, row]));
  const used = new Set<string>();
  const takeGuests = (
    keeper: WorldInfluencerCard,
    preferredIds: string[],
    max: number,
  ): WorldInfluencerCard[] => {
    const preferred = preferredIds
      .map((id) => byId.get(id))
      .filter(
        (row): row is WorldInfluencerCard =>
          !!row && row.id !== keeper.id && !used.has(row.id),
      );
    const partner = avatars.filter(
      (row) =>
        !used.has(row.id) &&
        (row.id === keeper.partnerId || keeper.partnerId === row.id),
    );
    const friends = avatars.filter(
      (row) =>
        row.id !== keeper.id &&
        !used.has(row.id) &&
        (row.relationshipIds.includes(keeper.id) ||
          keeper.relationshipIds.includes(row.id)),
    );
    const street = avatars.filter(
      (row) =>
        row.id !== keeper.id &&
        !used.has(row.id) &&
        row.street === keeper.street,
    );
    const seen = new Set<string>([keeper.id]);
    const guests: WorldInfluencerCard[] = [];
    for (const row of [...preferred, ...partner, ...friends, ...street, ...avatars]) {
      if (seen.has(row.id) || used.has(row.id)) continue;
      seen.add(row.id);
      guests.push(row);
      if (guests.length >= max) break;
    }
    return guests;
  };

  const groupSize = avatars.length >= 6 ? 3 : 2;
  const guestMax = groupSize - 1;
  const want =
    avatars.length < 4 ? 1 : Math.min(2, Math.floor(avatars.length / groupSize));
  const start = hashString(`${dayKey}:social`) % SOCIAL_HANGOUTS.length;
  const rotated = [
    ...SOCIAL_HANGOUTS.slice(start),
    ...SOCIAL_HANGOUTS.slice(0, start),
  ];

  const picks: Array<{
    place: { id: string; name: string };
    speakers: WorldInfluencerCard[];
  }> = [];

  for (const social of rotated) {
    if (picks.length >= want) break;
    const unused = avatars.filter((row) => !used.has(row.id));
    if (unused.length < 2) break;
    const locals = unused.filter((row) => row.street === social.street);
    const seed = pickHangoutSeed(social, unused, dayKey);
    if (!seed) continue;
    const guests = takeGuests(
      seed,
      locals.map((row) => row.id),
      guestMax,
    );
    if (guests.length === 0) continue;
    const speakers = [seed, ...guests].slice(0, groupSize);
    speakers.forEach((row) => used.add(row.id));
    picks.push({
      place: { id: social.id, name: social.name },
      speakers,
    });
  }

  if (picks.length === 0) {
    const [a, b] = avatars;
    if (!a || !b) return [];
    const fallback =
      SOCIAL_HANGOUTS[hashString(`${dayKey}:fallback`) % SOCIAL_HANGOUTS.length]!;
    return [
      {
        place: { id: fallback.id, name: fallback.name },
        speakers: [a, b],
      },
    ];
  }

  return picks;
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

function pickArchetype(
  avatars: WorldInfluencerCard[],
  salt: number,
  hint?: QuickCreateHint,
): ResidentArchetype {
  if (hint?.occupation?.trim()) {
    const q = hint.occupation.trim().toLowerCase();
    const match = ARCHETYPES.find(
      (arch) =>
        arch.occupation.toLowerCase() === q ||
        arch.occupation.toLowerCase().includes(q) ||
        q.includes(arch.occupation.toLowerCase()),
    );
    const base = match ?? ARCHETYPES[salt % ARCHETYPES.length]!;
    return {
      ...base,
      occupation: hint.occupation.trim(),
      location: hint.location?.trim() || base.location,
      gender: hint.gender ?? base.gender,
      culturalNotes: hint.vibe?.trim()
        ? `${base.culturalNotes}. ${hint.vibe.trim()}`
        : base.culturalNotes,
    };
  }

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
      return row.occupation.toLowerCase().includes(arch.occupation.split(" ")[0] ?? "");
    }).length;
    score -= genderCount;
    return { arch, score: score + index * 0.01 };
  }).sort((a, b) => b.score - a.score);
  const picked = ranked[0]?.arch ?? ARCHETYPES[salt % ARCHETYPES.length]!;
  return {
    ...picked,
    location: hint?.location?.trim() || picked.location,
    gender: hint?.gender ?? picked.gender,
    culturalNotes: hint?.vibe?.trim()
      ? `${picked.culturalNotes}. ${hint.vibe.trim()}`
      : picked.culturalNotes,
  };
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
  const economy = await runEconomyDay({
    userId: input.userId,
    avatars: refreshed,
  });
  const posts = await listWorldPosts(input.userId, 50);
  const posterCount = refreshed.length <= 1 ? 1 : 2;
  const posters = pickPosters(refreshed, posts, posterCount);
  const worldContext = await loadWorldGenerationContext(input.userId);

  const posted: WorldDayResult["posters"] = [];

  for (const poster of posters) {
    const detail = await loadWorldDetail(input.userId, poster.id);
    if (!detail) continue;
    const street =
      poster.street ||
      streetForOccupation(detail.world.occupation, detail.persona.location);

    const generated = await generateBackstoryContent({
      persona: detail.persona,
      world: detail.world,
      recentEvents: detail.events,
      autonomous: true,
      scene: `Morning (${dayKey}) on ${street}. You work as a ${detail.world.occupation || "neighbor"}. You woke up ${detail.world.mood}${
        detail.world.moodNote ? ` — ${detail.world.moodNote}` : ""
      }. ${economy.beat || "The town is open."} Live the morning as yourself. Do not wait for instructions. Do not represent a brand.`,
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
  const repliesWanted = others === 0 ? 0 : 1;
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

  const hangoutPicks = pickHangouts(refreshed, dayKey);
  let hangout: WorldDayResult["hangout"];
  const hangoutUsed = new Set<string>();
  const hangoutNames: string[] = [];
  const usedPlaces = new Set<string>();
  const chatBeats: string[] = [];

  for (const hangoutPick of hangoutPicks) {
    try {
      const [a, b, c] = hangoutPick.speakers;
      if (!a || !b) continue;
      const seeds = economy.seeds.slice(0, 4).join(" ");
      const social = SOCIAL_HANGOUTS.find(
        (row) => row.id === hangoutPick.place.id,
      );
      const activity = social
        ? pickActivity(social, dayKey, hangoutPick.speakers)
        : { line: hangoutPick.place.name, beat: "" };
      const chat = await generateNeighborChat({
        userId: input.userId,
        aId: a.id,
        bId: b.id,
        cId: c?.id,
        place: hangoutPick.place,
        activity: activity.line,
        scene: `Evening at ${hangoutPick.place.name}. Tonight: ${activity.line} ${activity.beat !== activity.line ? activity.beat : ""} ${social?.scene ?? ""} ${seeds || economy.beat || "The day is winding down."} Do the thing together, then talk. Friends, family, neighbors. No audience. No brand.`,
      });
      hangoutPick.speakers.forEach((row) => hangoutUsed.add(row.id));
      usedPlaces.add(hangoutPick.place.id);
      hangoutNames.push(
        `${hangoutPick.speakers.map((row) => row.displayName).join(" and ")} at ${hangoutPick.place.name} — ${activity.line}`,
      );
      if (!hangout) {
        hangout = {
          place: hangoutPick.place.name,
          names: hangoutPick.speakers.map((row) => row.displayName),
        };
      }
      chatBeats.push(chat.beat);
    } catch {
      // Hangout is extra — the morning still counted.
    }
  }

  const leftoverHangouts = SOCIAL_HANGOUTS.filter(
    (row) => !usedPlaces.has(row.id),
  );
  const extraChats = hangout
    ? leftoverHangouts.length > 0
      ? 1
      : 0
    : refreshed.length < 2
      ? 0
      : refreshed.length < 6
        ? 1
        : 2;
  const pairs = pickChatPairs(refreshed, extraChats, economy, hangoutUsed);
  for (const [index, pair] of pairs.entries()) {
    const [a, b] = pair;
    const social =
      leftoverHangouts[index % Math.max(1, leftoverHangouts.length)] ??
      SOCIAL_HANGOUTS[
        hashString(`${dayKey}:extra:${index}`) % SOCIAL_HANGOUTS.length
      ]!;
    const activity = pickActivity(social, `${dayKey}:extra:${index}`, [a, b]);
    try {
      const chat = await generateNeighborChat({
        userId: input.userId,
        aId: a.id,
        bId: b.id,
        place: { id: social.id, name: social.name },
        activity: activity.line,
        scene: `Evening at ${social.name}. Tonight: ${activity.line} ${activity.beat !== activity.line ? activity.beat : ""} ${social.scene} ${economy.seeds[0] || economy.beat || "The town is quieting down."} Do the thing, then talk like people with a minute. No audience. No brand.`,
      });
      chatBeats.push(chat.beat);
    } catch {
      break;
    }
  }

  const growth = await growWorldBonds(input.userId);

  const posterNames = posted.map((row) => row.name);
  const beatParts = [
    posterNames.length > 0 ? `${posterNames.join(", ")} posted.` : "",
    replyNames.length > 0 ? `${replyNames.join(", ")} answered.` : "",
    hangout
      ? hangoutNames.join(". ") + "."
      : "",
    chatBeats.length > 0 ? chatBeats.join(" ") : "",
    growth.beats.length > 0 ? growth.beats.join(" ") : "",
    economy.beat,
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
      hangout: hangout?.place,
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
    wages: economy.wages,
    listings: economy.listings,
    sales: economy.sales,
    rents: economy.rents,
    groceries: economy.groceries,
    hangout,
    growth: growth.beats,
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

async function draftDiversePersona(
  userId: string,
  hint?: QuickCreateHint,
): Promise<{
  persona: CreatorAvatarForm;
  extras: ReturnType<typeof worldFromArchetype>;
  usedAi: boolean;
  archetype: ResidentArchetype;
}> {
  const avatars = await listWorldInfluencers(userId);
  const salt = Date.now() + avatars.length * 97;
  const arch = pickArchetype(avatars, salt, hint);
  const names = generateNames({
    location: arch.location,
    gender: arch.gender,
    count: 4,
    salt,
  });
  const taken = new Set(avatars.map((row) => row.handle.toLowerCase()));
  const hintedName = hint?.name?.trim();
  const name = hintedName
    ? { full: hintedName.slice(0, 80), handle: handleFromName(hintedName) }
    : names.find((row) => !taken.has(row.handle.toLowerCase())) ??
      names[0] ?? {
        full: `${arch.occupation} Resident`,
        handle: handleFromName(arch.occupation),
      };
  const seed = personaFromArchetype(arch, {
    full: name.full,
    handle: name.handle,
  });

  if (!hasAnyAiKey() || hint?.skipAi) {
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
They must be 18+. Different city, job, culture, class, and faith from the roster unless a hint forces a job or city. Handle is camelCase alphanumeric. personalityVoice at least 20 characters.
They have no product, no company, no campaign, no audience. Not a brand mascot. Not a spokesperson. They work a real job and spend real-world money in Sparks.`,
      `Fill a gap. Honor any hints. Seed to remix:
${JSON.stringify({
  displayName: seed.displayName,
  handle: seed.handle,
  occupation: arch.occupation,
  location: arch.location,
  gender: seed.gender,
  age: seed.age,
  vibe: hint?.vibe?.trim() || undefined,
})}
Existing residents:
${roster || "- none yet — invent someone vivid"}
Jobs already in this world: ${JOB_TITLES.join(", ")}`,
      { maxTokens: 700, temperature: 0.95, jsonMode: true },
    )) ?? "";

  const raw = parseJsonObject(generated);
  const merged = mergePersonaDraft(arch, seed, raw);
  if (hintedName) {
    merged.persona.displayName = hintedName.slice(0, 80);
  }
  if (hint?.occupation?.trim()) {
    merged.extras.occupation = hint.occupation.trim().slice(0, 80);
  }
  if (hint?.location?.trim()) {
    merged.persona.location = hint.location.trim().slice(0, 120);
    merged.extras.currentCity =
      hint.location.split(",")[0]?.trim() || merged.extras.currentCity;
  }
  return { ...merged, usedAi: Boolean(raw), archetype: arch };
}

export async function paintResidentFace(
  userId: string,
  influencerId: string,
): Promise<{ portraitUrl: string } | null> {
  const detail = await loadWorldDetail(userId, influencerId);
  if (!detail) return null;
  if (!getImageProviderAvailability().any) {
    throw new Error("AI images aren't available right now.");
  }

  const prompt = buildAvatarImagePrompt(detail.persona);
  const result = await generateImageFromPrompt(prompt, {
    platform: "instagram",
    size: "1024x1024",
  });
  if (!result) return null;

  const { durableUrl } = await savePortraitRender({
    userId,
    influencerId,
    imageUrl: result.url,
    provider: result.provider,
    prompt: result.prompt,
    metadata: { source: "avatar-world", ownerless: true },
  });

  return { portraitUrl: durableUrl };
}

export async function spawnDiverseResident(
  userId: string,
  hint?: QuickCreateHint,
): Promise<SpawnResult> {
  const existing = await prisma.influencer.count({ where: { userId } });
  if (existing >= MAX_RESIDENTS) {
    throw new Error(`This world is full (${MAX_RESIDENTS} residents).`);
  }

  const draft = await draftDiversePersona(userId, hint);
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
  const account = await ensureResidentAccount({
    userId,
    influencerId,
    occupation,
  });
  const job = jobForOccupation(occupation);

  await recordWorldEvent({
    userId,
    influencerId,
    eventType: "world_spawn",
    payload: {
      kind: "arrived",
      title: "A new resident arrived",
      body: `${parsed.data.displayName} (${occupation}) showed up from ${parsed.data.location} with ${account.balance} Sparks and a job at ${job.employer}.`,
      mood: draft.extras.mood || "curious",
      occupation,
      location: parsed.data.location,
    },
  });

  const beat = `${parsed.data.displayName} arrived from ${parsed.data.location} as a ${occupation}.`;
  await rememberWorldBeat(userId, beat);

  let portraitUrl: string | undefined;
  if (hint?.withFace) {
    try {
      const painted = await paintResidentFace(userId, influencerId);
      portraitUrl = painted?.portraitUrl;
    } catch {
      // Arriving without a face is still arriving.
    }
  }

  const shouldWelcome = hint?.welcome !== false;
  const welcome = shouldWelcome
    ? await welcomeResident(userId, influencerId)
    : {};

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
    balance: account.balance,
    wage: account.wage,
    portraitUrl,
  };
}

export async function quickCreateResidents(
  userId: string,
  hint: QuickCreateHint & { count?: number } = {},
): Promise<{ created: SpawnResult[]; remaining: number }> {
  const count = Math.min(5, Math.max(1, hint.count ?? 1));
  const existing = await prisma.influencer.count({ where: { userId } });
  const remaining = Math.max(0, MAX_RESIDENTS - existing);
  if (remaining === 0) {
    throw new Error(`This world is full (${MAX_RESIDENTS} residents).`);
  }
  const want = Math.min(count, remaining);
  const withFace = hint.withFace !== false;
  const created: SpawnResult[] = [];
  for (let i = 0; i < want; i += 1) {
    const welcome = hint.welcome === true || (hint.welcome !== false && want === 1);
    const result = await spawnDiverseResident(userId, {
      ...hint,
      welcome,
      withFace,
    });
    created.push(result);
  }
  return {
    created,
    remaining: remaining - created.length,
  };
}

export async function foundTown(userId: string): Promise<{
  created: SpawnResult[];
  missing: string[];
  remaining: number;
  alreadyFounded: boolean;
  listings: number;
}> {
  const existing = await listWorldInfluencers(userId);
  const missing = missingTownJobs(existing.map((row) => row.occupation));
  const remainingSlots = Math.max(0, MAX_RESIDENTS - existing.length);
  if (missing.length === 0) {
    return {
      created: [],
      missing: [],
      remaining: remainingSlots,
      alreadyFounded: true,
      listings: 0,
    };
  }
  if (remainingSlots === 0) {
    throw new Error(`This world is full (${MAX_RESIDENTS} residents).`);
  }

  const want = missing.slice(0, remainingSlots);
  const created: SpawnResult[] = [];
  for (const occupation of want) {
    const result = await spawnDiverseResident(userId, {
      occupation,
      welcome: false,
      skipAi: true,
    });
    created.push(result);
  }

  const listings = await seedEssentialListings({
    userId,
    avatars: created.map((row) => ({
      id: row.influencerId,
      displayName: row.displayName,
      occupation: row.occupation,
    })),
  });

  const names = created.map((row) => `${row.displayName} (${row.occupation})`).join(", ");
  await rememberWorldBeat(
    userId,
    created.length > 0
      ? `The town opened: ${names}.`
      : "The town was already standing.",
  );

  return {
    created,
    missing: missingTownJobs(
      [...existing.map((row) => row.occupation), ...created.map((row) => row.occupation)],
    ),
    remaining: remainingSlots - created.length,
    alreadyFounded: false,
    listings,
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
