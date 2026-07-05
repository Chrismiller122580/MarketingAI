import { chatCompletion, hasAnyAiKey } from "@/lib/ai-client";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";
import type { BusinessModelType, SiteData } from "@/lib/types";
import {
  culturalNotesFromBrand,
  dedupeOptions,
  featureBundles,
  industryPersonality,
  industrySocialClass,
  makeOption,
  religionOptionsFromTone,
  slugHandle,
  type FieldOption,
} from "./avatar-option-presets";
import {
  classifySitePage,
  extractCrawledProductFacts,
  pickBestPageForFacts,
} from "./site-facts-extractor";

export type AvatarFieldKey =
  | "displayName"
  | "handle"
  | "gender"
  | "age"
  | "bodyType"
  | "height"
  | "faceShape"
  | "hair"
  | "location"
  | "neighborhoods"
  | "ageRangeShown"
  | "religion"
  | "socialClass"
  | "culturalNotes"
  | "personalityVoice"
  | "sampleQuote";

export type AvatarFieldOptions = {
  domain: string;
  fitScore: number;
  rationale: string;
  sourcePage?: { path: string; title: string };
  fields: Partial<Record<AvatarFieldKey, FieldOption[]>>;
  recommended: Partial<Record<AvatarFieldKey, string>>;
  productFacts?: Partial<ProductFactsForm>;
  aiEnhanced: boolean;
};

function resolveBusinessType(site: SiteData): BusinessModelType {
  return site.brand.businessModel?.type ?? "other";
}

function extractLocation(site: SiteData): string {
  const crawled = extractCrawledProductFacts(site);
  if (crawled.location) return crawled.location;

  const contactPage = site.pages.find((p) => classifySitePage(p) === "contact");
  const corpus = (contactPage ?? site.pages[0])?.excerpt ?? "";
  const match = corpus.match(
    /(?:located in|based in|serving|visit us at|headquarters in)\s+([A-Z][^.\n!]{3,60})/i,
  );
  return match?.[1]?.trim() ?? "";
}

function nameOptions(site: SiteData): FieldOption[] {
  const brand = site.brand.name;
  const persona = site.brand.synthesis?.audiencePersona ?? "";
  const firstNameMatch = persona.match(
    /(?:named?|like|e\.g\.|such as)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  );

  const candidates = [
    firstNameMatch?.[1],
    `${brand.split(/\s+/)[0] ?? "Brand"} Ambassador`,
    `${brand.split(/\s+/).slice(0, 2).join(" ")} Creator`,
    "Alex Rivera",
    "Jordan Kim",
  ].filter(Boolean) as string[];

  return dedupeOptions(
    candidates.map((name, i) =>
      makeOption(name, name, i === 0 && firstNameMatch ? "site" : "industry", i === 0 ? "high" : "medium"),
    ),
    4,
  );
}

function handleOptions(site: SiteData, names: FieldOption[]): FieldOption[] {
  const brandSlug = slugHandle(site.brand.name);
  const fromNames = names.map((n) =>
    makeOption(`@${slugHandle(n.value)}`, slugHandle(n.value), "site", "medium"),
  );
  return dedupeOptions(
    [
      makeOption(`@${brandSlug}`, brandSlug, "site", "high"),
      ...fromNames,
      makeOption(`@${brandSlug}Voice`, `${brandSlug}Voice`, "industry", "low"),
    ],
    4,
  );
}

function genderOptions(site: SiteData): FieldOption[] {
  const persona = (site.brand.synthesis?.audiencePersona ?? "").toLowerCase();
  const topics = site.brand.topics.join(" ").toLowerCase();
  const hay = `${persona} ${topics} ${site.brand.tone}`;

  const femaleLean =
    /women|female|mom|mother|she\/her|beauty|wellness|fashion/.test(hay);
  const maleLean = /men|male|dad|father|he\/him|bro/.test(hay);

  const opts: FieldOption[] = [];
  if (femaleLean) {
    opts.push(makeOption("Female", "female", "site", "high"));
    opts.push(makeOption("Male", "male", "industry", "medium"));
  } else if (maleLean) {
    opts.push(makeOption("Male", "male", "site", "high"));
    opts.push(makeOption("Female", "female", "industry", "medium"));
  } else {
    opts.push(makeOption("Female", "female", "industry", "medium"));
    opts.push(makeOption("Male", "male", "industry", "medium"));
  }
  opts.push(makeOption("Non-binary", "nonbinary", "industry", "low"));
  return dedupeOptions(opts, 3);
}

function ageOptions(type: BusinessModelType): FieldOption[] {
  const byType: Record<BusinessModelType, number[]> = {
    saas: [32, 38, 28],
    ecommerce: [26, 30, 34],
    services: [35, 42, 29],
    agency: [30, 36, 27],
    media: [28, 33, 25],
    local: [38, 45, 32],
    nonprofit: [34, 40, 28],
    other: [30, 35, 28],
  };
  const ages = byType[type] ?? byType.other;
  return dedupeOptions(
    ages.map((age) =>
      makeOption(`${age} years old`, String(age), "industry", "medium"),
    ),
    3,
  );
}

function bodyTypeOptions(type: BusinessModelType): FieldOption[] {
  const presets: Record<BusinessModelType, FieldOption[]> = {
    saas: [
      makeOption("Lean professional • 50", "50"),
      makeOption("Fit toned • 65", "65"),
    ],
    ecommerce: [
      makeOption("Fit lifestyle • 65", "65"),
      makeOption("Lean athletic • 50", "50"),
      makeOption("Curvy athletic • 75", "75"),
    ],
    local: [
      makeOption("Approachable • 50", "50"),
      makeOption("Fit toned • 65", "65"),
    ],
    services: [
      makeOption("Professional fit • 50", "50"),
      makeOption("Athletic • 65", "65"),
    ],
    agency: [
      makeOption("Creative fit • 50", "50"),
      makeOption("Polished • 65", "65"),
    ],
    media: [
      makeOption("Camera-ready • 65", "65"),
      makeOption("Lean • 50", "50"),
    ],
    nonprofit: [
      makeOption("Relatable • 50", "50"),
      makeOption("Warm • 65", "65"),
    ],
    other: [
      makeOption("Athletic • 50", "50"),
      makeOption("Fit toned • 65", "65"),
    ],
  };
  return dedupeOptions(presets[type] ?? presets.other, 3);
}

function physicalTraitOptions(gender: string): {
  height: FieldOption[];
  faceShape: FieldOption[];
  hair: FieldOption[];
} {
  const isMale = gender === "male";
  return {
    height: dedupeOptions(
      isMale
        ? [
            makeOption("5'10\"", "5'10\""),
            makeOption("6'0\"", "6'0\""),
            makeOption("5'8\"", "5'8\""),
          ]
        : [
            makeOption("5'6\"", "5'6\""),
            makeOption("5'4\"", "5'4\""),
            makeOption("5'8\"", "5'8\""),
          ],
      3,
    ),
    faceShape: dedupeOptions(
      [
        makeOption("Oval", "Oval"),
        makeOption("Heart", "Heart"),
        makeOption("Round", "Round"),
        makeOption("Square", "Square"),
      ],
      4,
    ),
    hair: dedupeOptions(
      isMale
        ? [
            makeOption("Short textured fade", "Short textured fade"),
            makeOption("Medium wavy brown", "Medium wavy brown"),
            makeOption("Clean cropped black", "Clean cropped black"),
          ]
        : [
            makeOption("Long wavy brown", "Long wavy brown"),
            makeOption("Shoulder-length straight black", "Shoulder-length straight black"),
            makeOption("Curly medium with highlights", "Curly medium with caramel highlights"),
          ],
      3,
    ),
  };
}

function neighborhoodOptions(
  location: string,
  type: BusinessModelType,
): FieldOption[] {
  const loc = location || "their city";
  const presets: FieldOption[] = [
    makeOption(
      `Upper-middle • Professional district in ${loc}`,
      `Upper-middle class • Professional district in ${loc}`,
      location ? "site" : "industry",
      location ? "high" : "medium",
    ),
    makeOption(
      "Suburban family-friendly • Relatable",
      "Suburban family-friendly • Relatable everyday neighborhood",
    ),
    makeOption(
      "Urban creative • Trend-forward",
      "Urban creative district • Trend-forward lifestyle",
    ),
  ];
  if (type === "local") {
    presets.unshift(
      makeOption(
        `Hometown pride • ${loc} community`,
        `Hometown pride • Well-known ${loc} community member`,
        "site",
        "high",
      ),
    );
  }
  return dedupeOptions(presets, 4);
}

function ageRangeOptions(ages: FieldOption[]): FieldOption[] {
  const primary = Number(ages[0]?.value ?? 30);
  const low = Math.max(18, primary - 4);
  const high = Math.min(80, primary + 4);
  return dedupeOptions(
    [
      makeOption(
        `${low}-${high} • On-camera energy`,
        `${low}-${high} • On-camera energy`,
      ),
      makeOption(
        `${low}-${high + 2} • Trusted spokesperson`,
        `${low}-${high + 2} • Trusted spokesperson vibe`,
      ),
      makeOption(
        `${primary} ± 3 • Peer-to-peer`,
        `${primary - 3}-${primary + 3} • Peer-to-peer relatability`,
      ),
    ],
    3,
  );
}

function personalityOptions(site: SiteData, type: BusinessModelType): FieldOption[] {
  const tone = site.brand.tone;
  const voiceGuide = site.brand.synthesis?.voiceGuide ?? "";
  const tagline = site.brand.tagline;

  const fromIndustry = industryPersonality(type);
  const fromSite: FieldOption[] = [];

  if (voiceGuide) {
    fromSite.push(
      makeOption(
        `Brand voice • ${tone}`,
        `Personality: ${voiceGuide.slice(0, 120)}. Voice: ${tone}, on-brand and authentic.`,
        "site",
        "high",
      ),
    );
  }
  if (tagline) {
    fromSite.push(
      makeOption(
        `Tagline energy • "${tagline.slice(0, 40)}${tagline.length > 40 ? "…" : ""}"`,
        `Personality: Embodies "${tagline}". Voice: ${tone}, enthusiastic but credible.`,
        "site",
        "medium",
      ),
    );
  }

  return dedupeOptions([...fromSite, ...fromIndustry], 4);
}

function sampleQuoteOptions(
  site: SiteData,
  facts: Partial<ProductFactsForm>,
): FieldOption[] {
  const feature = facts.features?.[0] ?? site.brand.tagline;
  const name = facts.name ?? site.brand.name;
  const price = facts.price;

  const opts: FieldOption[] = [];
  if (feature && name) {
    opts.push(
      makeOption(
        `Feature-led • ${feature.slice(0, 35)}…`,
        price
          ? `${name} at ${price} — ${feature}. That's why I keep recommending it.`
          : `I love ${name} because ${feature.toLowerCase()}.`,
        "site",
        "high",
      ),
    );
  }
  if (site.brand.tagline) {
    opts.push(
      makeOption(
        "Brand tagline adapted",
        `${site.brand.tagline} — and yes, I'm talking about ${name}.`,
        "site",
        "medium",
      ),
    );
  }
  opts.push(
    makeOption(
      "Conversational testimonial",
      `Honestly? ${name} changed how I talk about this category — ${feature ?? "the quality speaks for itself"}.`,
      "industry",
      "medium",
    ),
  );
  return dedupeOptions(opts, 3);
}

function pickRecommended(fields: Partial<Record<AvatarFieldKey, FieldOption[]>>): Partial<Record<AvatarFieldKey, string>> {
  const recommended: Partial<Record<AvatarFieldKey, string>> = {};
  for (const [key, options] of Object.entries(fields) as [AvatarFieldKey, FieldOption[]][]) {
    if (!options?.length) continue;
    const best =
      options.find((o) => o.confidence === "high") ??
      options.find((o) => o.source === "site") ??
      options[0];
    recommended[key] = best.id;
  }
  return recommended;
}

function optionValueById(
  fields: Partial<Record<AvatarFieldKey, FieldOption[]>>,
  key: AvatarFieldKey,
  id?: string,
): string | undefined {
  if (!id) return undefined;
  return fields[key]?.find((o) => o.id === id)?.value;
}

export function applyRecommendations(
  recommended: Partial<Record<AvatarFieldKey, string>>,
  fields: Partial<Record<AvatarFieldKey, FieldOption[]>>,
): Partial<CreatorAvatarForm> {
  const gender =
    optionValueById(fields, "gender", recommended.gender) ?? "female";
  return {
    displayName: optionValueById(fields, "displayName", recommended.displayName),
    handle: optionValueById(fields, "handle", recommended.handle),
    gender: gender as CreatorAvatarForm["gender"],
    age: Number(optionValueById(fields, "age", recommended.age) ?? 30),
    bodyType: Number(optionValueById(fields, "bodyType", recommended.bodyType) ?? 50),
    height: optionValueById(fields, "height", recommended.height),
    faceShape: optionValueById(fields, "faceShape", recommended.faceShape),
    hair: optionValueById(fields, "hair", recommended.hair),
    location: optionValueById(fields, "location", recommended.location),
    neighborhoods: optionValueById(fields, "neighborhoods", recommended.neighborhoods),
    ageRangeShown: optionValueById(fields, "ageRangeShown", recommended.ageRangeShown),
    religion: optionValueById(fields, "religion", recommended.religion),
    socialClass: optionValueById(fields, "socialClass", recommended.socialClass),
    culturalNotes: optionValueById(fields, "culturalNotes", recommended.culturalNotes),
    personalityVoice: optionValueById(fields, "personalityVoice", recommended.personalityVoice),
    sampleQuote: optionValueById(fields, "sampleQuote", recommended.sampleQuote),
  };
}

async function enhanceWithAi(
  site: SiteData,
  base: AvatarFieldOptions,
): Promise<AvatarFieldOptions | null> {
  if (!hasAnyAiKey()) return null;

  const summary = {
    brand: site.brand.name,
    tagline: site.brand.tagline,
    tone: site.brand.tone,
    topics: site.brand.topics.slice(0, 5),
    businessType: site.brand.businessModel?.type,
    audiencePersona: site.brand.synthesis?.audiencePersona,
    voiceGuide: site.brand.synthesis?.voiceGuide,
    location: extractLocation(site),
  };

  const raw = await chatCompletion(
    `You suggest influencer avatar field options for a brand website. Return JSON only with shape:
{
  "displayName": ["name1","name2"],
  "personalityVoice": ["full personality+voice string"],
  "culturalNotes": ["note1"],
  "sampleQuote": ["quote using only brand facts, no invented specs"]
}
Keep arrays to 2 items max. Be culturally respectful. No invented product claims.`,
    JSON.stringify(summary),
    { maxTokens: 500, temperature: 0.5, jsonMode: true },
  );

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const fields = { ...base.fields };

    if (parsed.displayName?.length) {
      const aiNames = parsed.displayName.map((n) =>
        makeOption(n, n, "ai", "medium"),
      );
      fields.displayName = dedupeOptions(
        [...aiNames, ...(fields.displayName ?? [])],
        5,
      );
    }
    if (parsed.personalityVoice?.length) {
      const aiPersonality = parsed.personalityVoice.map((p) =>
        makeOption(p.slice(0, 60) + (p.length > 60 ? "…" : ""), p, "ai", "medium"),
      );
      fields.personalityVoice = dedupeOptions(
        [...aiPersonality, ...(fields.personalityVoice ?? [])],
        5,
      );
    }
    if (parsed.culturalNotes?.length) {
      const aiNotes = parsed.culturalNotes.map((n) =>
        makeOption(n.slice(0, 50) + (n.length > 50 ? "…" : ""), n, "ai", "medium"),
      );
      fields.culturalNotes = dedupeOptions(
        [...aiNotes, ...(fields.culturalNotes ?? [])],
        5,
      );
    }
    if (parsed.sampleQuote?.length) {
      const aiQuotes = parsed.sampleQuote.map((q) =>
        makeOption(q.slice(0, 45) + (q.length > 45 ? "…" : ""), q, "ai", "medium"),
      );
      fields.sampleQuote = dedupeOptions(
        [...aiQuotes, ...(fields.sampleQuote ?? [])],
        4,
      );
    }

    const recommended = pickRecommended(fields);
    return {
      ...base,
      fields,
      recommended,
      aiEnhanced: true,
      fitScore: Math.min(100, base.fitScore + 8),
      rationale: `${base.rationale} AI refined name, voice, and cultural options.`,
    };
  } catch {
    return null;
  }
}

export async function suggestAvatarFromSite(
  site: SiteData,
  options?: { useAi?: boolean },
): Promise<AvatarFieldOptions> {
  const type = resolveBusinessType(site);
  const location = extractLocation(site);
  const tone = site.brand.tone || "Professional";
  const topics = site.brand.topics;
  const factsPage = pickBestPageForFacts(site);
  const crawled = extractCrawledProductFacts(site, factsPage);

  const names = nameOptions(site);
  const genders = genderOptions(site);
  const primaryGender = genders[0]?.value ?? "female";
  const physical = physicalTraitOptions(primaryGender);
  const ages = ageOptions(type);

  const locationOpts = dedupeOptions(
    [
      ...(location
        ? [
            makeOption(location, location, "site", "high"),
            makeOption(
              `${location} + remote`,
              `${location} + remote digital audience`,
              "site",
              "medium",
            ),
          ]
        : []),
      makeOption("Major metro • US", "New York, NY + nationwide audience"),
      makeOption("Coastal lifestyle", "Los Angeles, CA + Miami, FL"),
    ],
    4,
  );

  const fields: Partial<Record<AvatarFieldKey, FieldOption[]>> = {
    displayName: names,
    handle: handleOptions(site, names),
    gender: genders,
    age: ages,
    bodyType: bodyTypeOptions(type),
    height: physical.height,
    faceShape: physical.faceShape,
    hair: physical.hair,
    location: locationOpts,
    neighborhoods: neighborhoodOptions(location, type),
    ageRangeShown: ageRangeOptions(ages),
    religion: religionOptionsFromTone(tone),
    socialClass: industrySocialClass(type),
    culturalNotes: culturalNotesFromBrand(location, topics, tone),
    personalityVoice: personalityOptions(site, type),
    sampleQuote: sampleQuoteOptions(site, crawled),
  };

  const recommended = pickRecommended(fields);

  const hasSynthesis = Boolean(site.brand.synthesis?.voiceGuide);
  const hasLocation = Boolean(location);
  const fitScore =
    55 +
    (hasSynthesis ? 15 : 0) +
    (hasLocation ? 10 : 0) +
    (site.brand.businessModel ? 10 : 0) +
    (crawled.features?.length ? 10 : 0);

  const featureOpts = featureBundles(crawled.features ?? []);
  const productFacts: Partial<ProductFactsForm> = {
    name: crawled.name ?? site.brand.name,
    price: crawled.price ?? "",
    features:
      featureOpts[0]?.[0]?.value.split("\n").filter(Boolean) ??
      crawled.features ??
      [site.brand.tagline || site.brand.name],
    location: crawled.location ?? location,
    hours: crawled.hours,
  };

  let result: AvatarFieldOptions = {
    domain: site.domain,
    fitScore: Math.min(100, fitScore),
    rationale: hasSynthesis
      ? `Matched ${site.brand.name}'s brand voice, audience persona, and crawled pages.`
      : `Built from ${site.brand.name} crawl data and ${type} industry templates.`,
    sourcePage: factsPage
      ? { path: factsPage.path, title: factsPage.title }
      : undefined,
    fields,
    recommended,
    productFacts,
    aiEnhanced: false,
  };

  if (options?.useAi !== false) {
    const enhanced = await enhanceWithAi(site, result);
    if (enhanced) result = enhanced;
  }

  return result;
}

export function buildAvatarBrief(
  persona: CreatorAvatarForm,
  suggestion?: AvatarFieldOptions,
): string {
  const lines = [
    `${persona.displayName} (@${persona.handle})`,
    `${persona.age} · ${persona.gender} · ${persona.location}`,
    persona.socialClass,
    persona.culturalNotes,
    persona.personalityVoice.slice(0, 160),
  ];
  if (suggestion?.domain) {
    lines.unshift(`Site: ${suggestion.domain} (fit ${suggestion.fitScore}%)`);
  }
  return lines.filter(Boolean).join("\n");
}