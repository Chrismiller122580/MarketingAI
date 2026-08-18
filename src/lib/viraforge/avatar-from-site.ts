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
