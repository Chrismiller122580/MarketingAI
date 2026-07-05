import type { BusinessModelType } from "@/lib/types";

export type FieldOption = {
  id: string;
  label: string;
  value: string;
  source: "site" | "industry" | "ai";
  confidence: "high" | "medium" | "low";
};

let optionCounter = 0;

export function makeOption(
  label: string,
  value: string,
  source: FieldOption["source"] = "industry",
  confidence: FieldOption["confidence"] = "medium",
): FieldOption {
  optionCounter += 1;
  return {
    id: `opt_${optionCounter}`,
    label,
    value,
    source,
    confidence,
  };
}

export function dedupeOptions(options: FieldOption[], max = 5): FieldOption[] {
  const seen = new Set<string>();
  const out: FieldOption[] = [];
  for (const opt of options) {
    const key = opt.value.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(opt);
    if (out.length >= max) break;
  }
  return out;
}

const SOCIAL_CLASS_BY_TYPE: Record<BusinessModelType, FieldOption[]> = {
  saas: [
    makeOption("Upper Middle • College educated", "Upper Middle • College educated"),
    makeOption("Professional • Tech founder", "Professional • Tech founder • Startup culture"),
    makeOption("Corporate professional • B2B credible", "Corporate professional • Enterprise credible"),
  ],
  ecommerce: [
    makeOption("Upper Middle • Lifestyle conscious", "Upper Middle • Lifestyle conscious"),
    makeOption("Aspirational • Trend-forward", "Aspirational • Trend-forward shopper"),
    makeOption("Relatable • Value-focused", "Relatable • Value-focused everyday buyer"),
  ],
  services: [
    makeOption("Upper Middle • Trusted advisor", "Upper Middle • Trusted local professional"),
    makeOption("Professional • Service expert", "Professional • Certified expert"),
    makeOption("Approachable • Neighborly", "Approachable • Neighborly service provider"),
  ],
  agency: [
    makeOption("Creative class • Agency insider", "Creative class • Agency insider"),
    makeOption("Professional • Marketing strategist", "Professional • Marketing strategist"),
    makeOption("Upper Middle • Brand consultant", "Upper Middle • Brand consultant"),
  ],
  media: [
    makeOption("Creative • Media personality", "Creative • Media personality"),
    makeOption("Relatable • Community voice", "Relatable • Community voice"),
    makeOption("Professional • Industry commentator", "Professional • Industry commentator"),
  ],
  local: [
    makeOption("Community neighbor • Trusted local", "Community neighbor • Trusted local"),
    makeOption("Family-owned warmth • Hometown pride", "Family-owned warmth • Hometown pride"),
    makeOption("Upper Middle • Local professional", "Upper Middle • Local professional"),
  ],
  nonprofit: [
    makeOption("Mission-driven • Community advocate", "Mission-driven • Community advocate"),
    makeOption("Relatable • Grassroots organizer", "Relatable • Grassroots organizer"),
    makeOption("Professional • Program leader", "Professional • Program leader"),
  ],
  other: [
    makeOption("Upper Middle • College educated", "Upper Middle • College educated"),
    makeOption("Professional • Credible spokesperson", "Professional • Credible spokesperson"),
    makeOption("Approachable • Authentic voice", "Approachable • Authentic brand voice"),
  ],
};

const PERSONALITY_BY_TYPE: Record<BusinessModelType, FieldOption[]> = {
  saas: [
    makeOption(
      "Clear, confident, helpful — explains value without hype",
      "Personality: Clear, confident, helpful. Voice: Professional, concise, trustworthy — explains product value without hype.",
    ),
    makeOption(
      "Founder energy — visionary but grounded",
      "Personality: Founder energy, visionary but grounded. Voice: Direct, enthusiastic, credible for B2B buyers.",
    ),
  ],
  ecommerce: [
    makeOption(
      "Warm lifestyle creator — product-forward",
      "Personality: Warm, enthusiastic lifestyle creator. Voice: Friendly, aspirational, product-forward.",
    ),
    makeOption(
      "Honest reviewer — relatable and specific",
      "Personality: Honest reviewer vibe. Voice: Relatable, specific about benefits, never oversells.",
    ),
  ],
  local: [
    makeOption(
      "Neighborly expert — community trust",
      "Personality: Neighborly, trustworthy local expert. Voice: Warm, conversational, community-rooted.",
    ),
    makeOption(
      "Family business pride — personal and caring",
      "Personality: Family business pride. Voice: Personal, caring, proud of local roots.",
    ),
  ],
  services: [
    makeOption(
      "Professional advisor — calm authority",
      "Personality: Professional advisor. Voice: Calm authority, reassuring, service-focused.",
    ),
    makeOption(
      "Hands-on expert — practical and direct",
      "Personality: Hands-on expert. Voice: Practical, direct, results-oriented.",
    ),
  ],
  agency: [
    makeOption(
      "Creative strategist — bold but polished",
      "Personality: Creative strategist. Voice: Bold but polished, brand-savvy.",
    ),
  ],
  media: [
    makeOption(
      "Engaging host — energetic storyteller",
      "Personality: Engaging host. Voice: Energetic storyteller, audience-first.",
    ),
  ],
  nonprofit: [
    makeOption(
      "Mission advocate — heartfelt and factual",
      "Personality: Mission advocate. Voice: Heartfelt, factual, community-centered.",
    ),
  ],
  other: [
    makeOption(
      "Professional yet approachable",
      "Personality: Professional yet approachable. Voice: Clear, warm, brand-aligned.",
    ),
  ],
};

export function industrySocialClass(type: BusinessModelType): FieldOption[] {
  return SOCIAL_CLASS_BY_TYPE[type] ?? SOCIAL_CLASS_BY_TYPE.other;
}

export function industryPersonality(type: BusinessModelType): FieldOption[] {
  return PERSONALITY_BY_TYPE[type] ?? PERSONALITY_BY_TYPE.other;
}

export function religionOptionsFromTone(tone: string): FieldOption[] {
  const base = [
    makeOption("Secular • Inclusive and modern", "Secular • Inclusive and modern"),
    makeOption("Spiritual • Wellness-focused", "Spiritual • Wellness-focused, not preachy"),
    makeOption("Faith-friendly • Respectful and warm", "Faith-friendly • Respectful and warm"),
  ];
  if (/professional|corporate/i.test(tone)) {
    base.unshift(
      makeOption("Secular professional • Values-driven", "Secular professional • Values-driven"),
    );
  }
  return dedupeOptions(base, 4);
}

export function culturalNotesFromBrand(
  location: string,
  topics: string[],
  tone: string,
): FieldOption[] {
  const topicHint = topics.slice(0, 2).join(" & ") || "brand lifestyle";
  return dedupeOptions(
    [
      makeOption(
        `Local pride • Rooted in ${location || "their community"}`,
        `Local pride • Rooted in ${location || "their community"} • Passionate about ${topicHint}`,
        "site",
        location ? "high" : "medium",
      ),
      makeOption(
        `${tone} brand voice • ${topicHint} enthusiast`,
        `${tone} cultural vibe • Enthusiast for ${topicHint} • Authentic on camera`,
        "site",
        "medium",
      ),
      makeOption(
        "Modern professional • Culturally aware",
        "Modern professional • Culturally aware • Speaks to diverse audiences",
      ),
      makeOption(
        "Community connector • Relatable storyteller",
        "Community connector • Relatable storyteller • Loves sharing real experiences",
      ),
    ],
    4,
  );
}

export function slugHandle(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join("")
    .replace(/\s/g, "")
    .slice(0, 28) || "BrandCreator";
}

export function featureBundles(features: string[]): FieldOption[][] {
  if (features.length === 0) return [];

  const bundles: FieldOption[][] = [];
  const primary = features.slice(0, 4);
  bundles.push([
    makeOption(
      primary.join(" • "),
      primary.join("\n"),
      "site",
      "high",
    ),
  ]);

  if (features.length > 2) {
    const alt = features.slice(1, 5);
    bundles.push([
      makeOption(
        alt.join(" • "),
        alt.join("\n"),
        "site",
        "medium",
      ),
    ]);
  }

  const valueLed = features.filter((f) => f.length > 20).slice(0, 3);
  if (valueLed.length > 0) {
    bundles.push([
      makeOption(
        `Value focus: ${valueLed[0]?.slice(0, 40)}…`,
        valueLed.join("\n"),
        "site",
        "medium",
      ),
    ]);
  }

  return bundles.slice(0, 3);
}