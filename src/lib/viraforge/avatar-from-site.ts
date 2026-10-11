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
  industryWardrobe,
  makeOption,
  wardrobeQuickPicks,
  religionOptionsFromTone,
  slugHandle,
  type FieldOption,
} from "./avatar-option-presets";
import { nameOptionsFromLocation } from "./avatar-name-generator";
import {
  inferAudiencePlace,
  lookForAudience,
  type AudiencePlace,
} from "./audience-place";
import {
  classifySitePage,
  detectOfferingFocus,
  extractCrawledProductFacts,
  inferProductFactFields,
  normalizeProductFactsForSite,
  pickBestPageForFacts,
  type ProductFactFieldsConfig,
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
  | "wardrobe"
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
  factFields?: ProductFactFieldsConfig;
  aiEnhanced: boolean;
  independent?: boolean;
};

function resolveBusinessType(site: SiteData): BusinessModelType {
  return site.brand.businessModel?.type ?? "other";
}

function siteCorpus(site: SiteData): string {
  return [
    site.domain,
    site.brand.name,
    site.brand.tagline,
    site.brand.topics.join(" "),
    ...site.pages.slice(0, 8).map(
      (page) =>
        `${page.title} ${page.description} ${page.excerpt} ${page.headings.join(" ")}`,
    ),
  ].join("\n");
}

function extractLocation(site: SiteData): string {
  const place = inferAudiencePlace(siteCorpus(site));
  if (place) return place.label;

  const crawled = extractCrawledProductFacts(site);
  if (crawled.location) return crawled.location;

  const contactPage = site.pages.find((p) => classifySitePage(p) === "contact");
  const corpus = (contactPage ?? site.pages[0])?.excerpt ?? "";
  const match = corpus.match(
    /(?:located in|based in|serving|visit us at|headquarters in)\s+([A-Z][^\.\n!]{3,60})/i,
  );
  return match?.[1]?.trim() ?? "";
}

function audienceForSite(site: SiteData): AudiencePlace | null {
  return inferAudiencePlace(`${extractLocation(site)}\n${siteCorpus(site)}`);
}

function nameOptions(site: SiteData): FieldOption[] {
  const location = extractLocation(site);
  return nameOptionsFromLocation(location, site.brand.name, "female");
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

function physicalTraitOptions(
  gender: string,
  place: AudiencePlace | null,
): {
  height: FieldOption[];
  faceShape: FieldOption[];
  hair: FieldOption[];
} {
  const look = lookForAudience(
    place?.kind ?? null,
    gender === "male" ? "male" : gender === "nonbinary" ? "nonbinary" : "female",
    place?.label ?? "",
  );
  const regionalHair =
    look?.hair.map((item) => makeOption(item.label, item.value, "site", "high")) ??
    [];
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
      [
        ...regionalHair,
        ...(isMale
          ? [
              makeOption("Short textured fade", "Short textured fade"),
              makeOption("Medium wavy brown", "Medium wavy brown"),
              makeOption("Clean cropped black", "Clean cropped black"),
            ]
          : [
              makeOption("Long wavy brown", "Long wavy brown"),
              makeOption("Shoulder-length straight black", "Shoulder-length straight black"),
              makeOption("Curly medium with highlights", "Curly medium with caramel highlights"),
            ]),
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

function personalityOptions(
  site: SiteData,
  type: BusinessModelType,
  place: AudiencePlace | null,
  gender: string,
): FieldOption[] {
  const tone = site.brand.tone;
  const voiceGuide = site.brand.synthesis?.voiceGuide ?? "";
  const tagline = site.brand.tagline;
  const look = lookForAudience(
    place?.kind ?? null,
    gender === "male" ? "male" : gender === "nonbinary" ? "nonbinary" : "female",
    place?.label ?? extractLocation(site),
  );

  const fromIndustry = industryPersonality(type);
  const fromSite: FieldOption[] = [];
  if (look) {
    fromSite.push(
      makeOption(
        place?.kind === "us-south" ? "Southern country voice" : "Local voice",
        look.personalityVoice,
        "site",
        "high",
      ),
    );
  }

  if (voiceGuide) {
    fromSite.push(
      makeOption(
        `Brand voice • ${tone}`,
        `Personality: ${voiceGuide.slice(0, 120)}. Voice: ${tone}, on-brand and authentic.`,
        "site",
        look ? "medium" : "high",
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

function wardrobeOptions(
  site: SiteData,
  type: BusinessModelType,
  place: AudiencePlace | null,
  gender: string,
): FieldOption[] {
  const topics = site.brand.topics.join(" ").toLowerCase();
  const tone = site.brand.tone.toLowerCase();
  const fromSite: FieldOption[] = [];
  const look = lookForAudience(
    place?.kind ?? null,
    gender === "male" ? "male" : gender === "nonbinary" ? "nonbinary" : "female",
    place?.label ?? "",
  );
  if (look) {
    fromSite.push(
      makeOption(
        place?.kind === "us-south" ? "Country casual" : "Local everyday",
        look.wardrobe,
        "site",
        "high",
      ),
    );
  }

  if (/fitness|gym|sport|wellness|yoga|crossfit|protein|health/.test(topics)) {
    fromSite.push(
      makeOption(
        "Performance athleisure",
        "Performance athleisure — moisture-wicking crop top or tank, high-rise leggings, training shoes; gym-to-street ready.",
        "site",
        "high",
      ),
    );
  }
  if (/fashion|apparel|clothing|style|boutique/.test(topics)) {
    fromSite.push(
      makeOption(
        "Trend-forward editorial",
        "Trend-forward editorial — statement pieces, layered textures, runway-inspired street style for product showcases.",
        "site",
        "high",
      ),
    );
  }
  if (/beauty|skincare|cosmetic|makeup/.test(topics)) {
    fromSite.push(
      makeOption(
        "Beauty creator glam-casual",
        "Beauty creator glam-casual — soft glam makeup, satin blouse, delicate jewelry; tutorial-friendly outfit.",
        "site",
        "high",
      ),
    );
  }
  if (/food|restaurant|cafe|culinary/.test(topics)) {
    fromSite.push(
      makeOption(
        "Chef-casual hospitality",
        "Chef-casual hospitality — clean apron over smart casual, approachable food-creator styling.",
        "site",
        "medium",
      ),
    );
  }
  if (/professional|corporate|enterprise|b2b/.test(tone)) {
    fromSite.push(
      makeOption(
        "Polished B2B spokesperson",
        "Polished B2B spokesperson — structured blazer, neutral blouse or shirt, confident executive-casual styling.",
        "site",
        "medium",
      ),
    );
  }

  return dedupeOptions(
    [...fromSite, ...industryWardrobe(type), ...wardrobeQuickPicks()],
    6,
  );
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
    wardrobe: optionValueById(fields, "wardrobe", recommended.wardrobe),
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
Keep arrays to 2 items max. The avatar must look and sound local to "location". A US South city such as Chattanooga or anywhere in Tennessee, Georgia, Alabama, or the Carolinas is a country Southern American who speaks English — never a Spanish-speaking Latina and never a Colombian default. A Latin American city stays local to that city. No invented product claims.`,
    JSON.stringify(summary),
    { maxTokens: 500, temperature: 0.5, jsonMode: true },
  );

  if (!raw) return null;
  return applyAiFieldPatches(
    base,
    raw,
    `${base.rationale} AI refined name, voice, and cultural options.`,
  );
}

function applyAiFieldPatches(
  base: AvatarFieldOptions,
  raw: string,
  rationale: string,
): AvatarFieldOptions | null {
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
      rationale,
    };
  } catch {
    return null;
  }
}

export async function suggestAvatarFromSite(
  site: SiteData,
  options?: { useAi?: boolean; pagePath?: string },
): Promise<AvatarFieldOptions> {
  const type = resolveBusinessType(site);
  const location = extractLocation(site);
  const tone = site.brand.tone || "Professional";
  const topics = site.brand.topics;
  const offeringFocus = detectOfferingFocus(site);
  const factsPage = pickBestPageForFacts(site, options?.pagePath);
  const crawled = extractCrawledProductFacts(site, factsPage);

  const names = nameOptions(site);
  const genders = genderOptions(site);
  const primaryGender = genders[0]?.value ?? "female";
  const place = audienceForSite(site);
  const physical = physicalTraitOptions(primaryGender, place);
  const ages = ageOptions(type);
  const look = lookForAudience(
    place?.kind ?? null,
    primaryGender === "male"
      ? "male"
      : primaryGender === "nonbinary"
        ? "nonbinary"
        : "female",
    place?.label || location,
  );

  const locationOpts = dedupeOptions(
    [
      ...(location
        ? [
            makeOption(location, location, "site", "high"),
            makeOption(
              `${location} metro`,
              `${location} and nearby towns`,
              "site",
              "medium",
            ),
          ]
        : []),
      ...(place
        ? []
        : [
            makeOption("United States", "United States"),
            makeOption("Major US city", "A major US city, English speaking"),
          ]),
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
    neighborhoods: look
      ? dedupeOptions(
          [
            makeOption("Hometown", look.neighborhoods, "site", "high"),
            ...neighborhoodOptions(location, type),
          ],
          4,
        )
      : neighborhoodOptions(location, type),
    ageRangeShown: ageRangeOptions(ages),
    religion: religionOptionsFromTone(tone),
    socialClass: industrySocialClass(type),
    wardrobe: wardrobeOptions(site, type, place, primaryGender),
    culturalNotes: look
      ? dedupeOptions(
          [
            makeOption(
              place?.kind === "us-south"
                ? primaryGender === "male"
                  ? "Southern hometown"
                  : "Country Southern girl"
                : "Local",
              look.culturalNotes,
              "site",
              "high",
            ),
            ...culturalNotesFromBrand(location, topics, tone),
          ],
          4,
        )
      : culturalNotesFromBrand(location, topics, tone),
    personalityVoice: personalityOptions(site, type, place, primaryGender),
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
  const factFields = inferProductFactFields(site);
  const productFacts = normalizeProductFactsForSite(
    {
      name: crawled.name ?? site.brand.name,
      price: crawled.price ?? "",
      features:
        featureOpts[0]?.[0]?.value.split("\n").filter(Boolean) ??
        crawled.features ??
        [site.brand.tagline || site.brand.name],
      location: factFields.location.show
        ? crawled.location ?? location
        : undefined,
      hours: factFields.hours.show ? crawled.hours : undefined,
      ingredients: factFields.ingredients.show ? [] : [],
    },
    factFields,
  );

  let result: AvatarFieldOptions = {
    domain: site.domain,
    fitScore: Math.min(100, fitScore),
    rationale: hasSynthesis
      ? `Matched ${site.brand.name}'s brand voice and ${offeringFocus.replaceAll("_", " ")} pages${factsPage ? ` (facts from ${factsPage.path})` : ""}.`
      : `Built from ${site.brand.name} crawl data (${offeringFocus.replaceAll("_", " ")} focus${factsPage ? `, facts from ${factsPage.path}` : ""}).`,
    sourcePage: factsPage
      ? { path: factsPage.path, title: factsPage.title }
      : undefined,
    fields,
    recommended,
    productFacts,
    factFields,
    aiEnhanced: false,
  };

  if (options?.useAi !== false) {
    const enhanced = await enhanceWithAi(site, result);
    if (enhanced) result = enhanced;
  }

  return result;
}

const INDEPENDENT_LOCATIONS = [
  "New Orleans, Louisiana",
  "Tokyo, Japan",
  "Accra, Ghana",
  "Barcelona, Spain",
  "Nairobi, Kenya",
  "Mexico City, Mexico",
  "Reykjavík, Iceland",
  "Manila, Philippines",
  "Helsinki, Finland",
  "Cape Town, South Africa",
];

async function enhanceIndependentWithAi(
  base: AvatarFieldOptions,
): Promise<AvatarFieldOptions | null> {
  if (!hasAnyAiKey()) return null;

  const raw = await chatCompletion(
    `You suggest influencer avatar field options for an independent persona with no brand website and no product. Return JSON only with shape:
{
  "displayName": ["name1","name2"],
  "personalityVoice": ["full personality+voice string"],
  "culturalNotes": ["note1"],
  "sampleQuote": ["quote with no product, price, or brand claims"]
}
Keep arrays to 2 items max. Be culturally diverse and respectful. Do not invent a product or company.`,
    JSON.stringify({
      locations: (base.fields.location ?? []).map((o) => o.value).slice(0, 4),
      names: (base.fields.displayName ?? []).map((o) => o.value).slice(0, 4),
    }),
    { maxTokens: 500, temperature: 0.7, jsonMode: true },
  );

  if (!raw) return null;
  return applyAiFieldPatches(
    base,
    raw,
    `${base.rationale} AI refined name, voice, and cultural options.`,
  );
}

/** Persona options with no crawled site and no product facts. */
export async function suggestIndependentAvatar(options?: {
  useAi?: boolean;
}): Promise<AvatarFieldOptions> {
  const salt = Date.now();
  const genderCycle: CreatorAvatarForm["gender"][] = [
    "female",
    "male",
    "nonbinary",
  ];
  const primaryGender = genderCycle[salt % 3] ?? "female";
  const type: BusinessModelType = "other";
  const start = salt % INDEPENDENT_LOCATIONS.length;
  const locations = [0, 1, 2, 3].map(
    (i) =>
      INDEPENDENT_LOCATIONS[
        (start + i * 3) % INDEPENDENT_LOCATIONS.length
      ] ?? "Barcelona, Spain",
  );
  const primaryLocation = locations[0] ?? "Barcelona, Spain";

  const names = nameOptionsFromLocation(primaryLocation, undefined, primaryGender);
  const genders = dedupeOptions(
    [
      makeOption(
        primaryGender === "nonbinary"
          ? "Non-binary"
          : primaryGender === "male"
            ? "Male"
            : "Female",
        primaryGender,
        "industry",
        "high",
      ),
      makeOption("Female", "female"),
      makeOption("Male", "male"),
      makeOption("Non-binary", "nonbinary"),
    ],
    3,
  );
  const physical = physicalTraitOptions(primaryGender, null);
  const ages = ageOptions(type);
  const locationOpts = dedupeOptions(
    locations.map((loc, i) =>
      makeOption(loc, loc, "industry", i === 0 ? "high" : "medium"),
    ),
    4,
  );

  const fields: Partial<Record<AvatarFieldKey, FieldOption[]>> = {
    displayName: names.map((n, i) =>
      makeOption(n.label, n.value, "industry", i < 2 ? "high" : "medium"),
    ),
    handle: dedupeOptions(
      names.map((n) =>
        makeOption(`@${slugHandle(n.value)}`, slugHandle(n.value), "industry", "medium"),
      ),
      4,
    ),
    gender: genders,
    age: ages,
    bodyType: bodyTypeOptions(type),
    height: physical.height,
    faceShape: physical.faceShape,
    hair: physical.hair,
    location: locationOpts,
    neighborhoods: neighborhoodOptions(primaryLocation, type),
    ageRangeShown: ageRangeOptions(ages),
    religion: religionOptionsFromTone("authentic"),
    socialClass: industrySocialClass(type),
    wardrobe: dedupeOptions(
      [...industryWardrobe(type), ...wardrobeQuickPicks()],
      6,
    ),
    culturalNotes: culturalNotesFromBrand(primaryLocation, [], "authentic"),
    personalityVoice: industryPersonality(type),
    sampleQuote: dedupeOptions(
      [
        makeOption(
          "Show up for yourself",
          "Show up for yourself first — consistency beats intensity every time.",
        ),
        makeOption(
          "The work is the point",
          "The work is the point. The rest is noise.",
        ),
        makeOption(
          "Small days still count",
          "Small days still count. That's how a life gets built.",
        ),
      ],
      3,
    ),
  };

  const recommended = pickRecommended(fields);

  let result: AvatarFieldOptions = {
    domain: "",
    fitScore: 70,
    rationale:
      "Independent persona — no crawled site and no product facts applied.",
    fields,
    recommended,
    aiEnhanced: false,
    independent: true,
  };

  if (options?.useAi !== false) {
    const enhanced = await enhanceIndependentWithAi(result);
    if (enhanced) result = { ...enhanced, independent: true };
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
  if (suggestion?.independent) {
    lines.unshift("Independent persona (no site, no product facts)");
  } else if (suggestion?.domain) {
    lines.unshift(`Site: ${suggestion.domain} (fit ${suggestion.fitScore}%)`);
  }
  return lines.filter(Boolean).join("\n");
}
