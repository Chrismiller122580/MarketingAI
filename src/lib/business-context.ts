import type { BrandProfile, BusinessModel, Platform } from "./types";
import type { VisualTargeting } from "./visual-targeting";
import { DEFAULT_VISUAL_TARGETING } from "./visual-targeting";

export function formatBusinessContext(brand: BrandProfile): string {
  const bm = brand.businessModel;
  if (!bm) return "";

  const parts = [
    `Business type: ${bm.type}`,
    `Market: ${bm.market}`,
    `Value proposition: ${bm.valueProposition}`,
    `Revenue model: ${bm.revenueModel}`,
    `Conversion goal: ${bm.conversionGoal}`,
  ];
  if (bm.differentiators.length > 0) {
    parts.push(`Differentiators: ${bm.differentiators.join(", ")}`);
  }
  if (bm.painPoints.length > 0) {
    parts.push(`Customer pain points: ${bm.painPoints.join(", ")}`);
  }
  return parts.join(". ");
}

export function buildBusinessInsights(brand: BrandProfile): string[] {
  const bm = brand.businessModel;
  if (!bm) return [];

  return [
    `Business model: ${bm.type} (${bm.market})`,
    `Core value: ${bm.valueProposition}`,
    `Revenue: ${bm.revenueModel} → goal: ${bm.conversionGoal}`,
    ...(bm.differentiators.length > 0
      ? [`Differentiators: ${bm.differentiators.slice(0, 3).join(", ")}`]
      : []),
  ];
}

const PLATFORM_COPY_HINTS: Record<Platform, string> = {
  instagram:
    "Hook in line 1 (under 12 words). 80–150 words. Max 5 hashtags at the end. One CTA. No 'Excited to announce'.",
  twitter:
    "One punchy insight under 240 characters. No hashtag walls. Sound like a person, not a brand account.",
  linkedin:
    "Open with a specific result, number, or tension. 80–180 words. Short paragraphs. No emoji overload.",
  facebook:
    "Conversational first line that invites a comment. 50–120 words. One question or CTA, not both stacked.",
  pinterest:
    "Descriptive, keyword-rich, aspirational. Lead with the outcome the pin delivers.",
  email:
    "Subject-style first line, then one benefit, then a single CTA. No fluff greeting.",
};

export function platformCopyHint(platform: Platform): string {
  return PLATFORM_COPY_HINTS[platform];
}

const PLATFORM_VISUAL_DEFAULTS: Partial<
  Record<Platform, Partial<VisualTargeting>>
> = {
  instagram: { scene: "people", mood: "energetic", setting: "outdoor" },
  linkedin: { scene: "business", demographic: "professionals", mood: "professional", setting: "office" },
  twitter: { scene: "technology", mood: "energetic", setting: "studio" },
  facebook: { scene: "people", demographic: "families", mood: "playful", setting: "home" },
  pinterest: { scene: "product", mood: "inspiring", setting: "studio" },
  email: { scene: "product", mood: "professional", setting: "studio" },
};

const BUSINESS_VISUAL_HINTS: Record<
  BusinessModel["type"],
  Partial<VisualTargeting>
> = {
  saas: { scene: "technology", mood: "professional", setting: "office" },
  ecommerce: { scene: "product", mood: "energetic", setting: "studio" },
  services: { scene: "team", demographic: "professionals", mood: "professional", setting: "office" },
  agency: { scene: "team", demographic: "diverse", mood: "inspiring", setting: "office" },
  media: { scene: "abstract", mood: "inspiring", setting: "studio" },
  local: { scene: "people", demographic: "families", mood: "calm", setting: "outdoor" },
  nonprofit: { scene: "people", demographic: "diverse", mood: "inspiring", setting: "outdoor" },
  other: { scene: "business", mood: "professional", setting: "auto" },
};

export function suggestVisualTargeting(
  brand: BrandProfile,
  platform: Platform,
  current?: VisualTargeting,
): VisualTargeting {
  const base = { ...DEFAULT_VISUAL_TARGETING, ...current };
  const hasManual =
    base.scene !== "auto" ||
    base.demographic !== "auto" ||
    base.mood !== "auto" ||
    base.setting !== "auto";
  if (hasManual) return base;

  const platformHints = PLATFORM_VISUAL_DEFAULTS[platform] ?? {};
  const businessHints = brand.businessModel
    ? BUSINESS_VISUAL_HINTS[brand.businessModel.type]
    : {};

  return {
    scene: businessHints.scene ?? platformHints.scene ?? "auto",
    demographic: businessHints.demographic ?? platformHints.demographic ?? "auto",
    mood: businessHints.mood ?? platformHints.mood ?? "auto",
    setting: businessHints.setting ?? platformHints.setting ?? "auto",
  };
}