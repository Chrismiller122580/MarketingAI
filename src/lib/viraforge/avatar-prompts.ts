import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";
import { formatFactsForPrompt } from "./claim-validator";

const BODY_TYPE_LABELS: Record<number, string> = {
  0: "slim",
  25: "lean athletic",
  50: "athletic",
  65: "fit toned",
  75: "curvy athletic",
  100: "muscular",
};

function bodyTypeLabel(value: number): string {
  const keys = Object.keys(BODY_TYPE_LABELS)
    .map(Number)
    .sort((a, b) => a - b);
  let closest = keys[0];
  for (const key of keys) {
    if (Math.abs(key - value) < Math.abs(closest - value)) closest = key;
  }
  return BODY_TYPE_LABELS[closest] ?? "athletic";
}

export type AvatarSiteContext = {
  domain?: string;
  brandName?: string;
  tone?: string;
  tagline?: string;
};

export function buildAvatarImagePrompt(
  persona: CreatorAvatarForm,
  options?: {
    personalization?: string;
    productFacts?: ProductFactsForm;
    site?: AvatarSiteContext;
  },
): string {
  const genderLabel =
    persona.gender === "female"
      ? "woman"
      : persona.gender === "male"
        ? "man"
        : "person";

  return [
    `Hyper-realistic portrait photograph of a ${persona.age}-year-old ${genderLabel}.`,
    `Name reference: ${persona.displayName}.`,
    `Physique: ${bodyTypeLabel(persona.bodyType)}, height ${persona.height}, ${persona.faceShape} face shape.`,
    `Hair: ${persona.hair}.`,
    `Location and cultural context: ${persona.location}. ${persona.culturalNotes}.`,
    `Social context: ${persona.socialClass}. Religion: ${persona.religion}.`,
    persona.neighborhoods ? `Neighborhood vibe: ${persona.neighborhoods}.` : "",
    `Wardrobe: ${persona.wardrobe}`,
    `Expression and mood: ${persona.personalityVoice.slice(0, 200)}.`,
    options?.personalization ?? "",
    options?.site?.brandName
      ? `Brand alignment: spokesperson for ${options.site.brandName}${options.site.domain ? ` (${options.site.domain})` : ""}. Tone: ${options.site.tone ?? "on-brand"}.`
      : "",
    options?.site?.tagline ? `Brand message: ${options.site.tagline}.` : "",
    options?.productFacts ? formatFactsForPrompt(options.productFacts) : "",
    "Professional influencer headshot, natural lighting, shallow depth of field, 85mm lens look.",
    "Photorealistic, consistent facial features, no text overlays, no watermarks, no logos.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildAvatarPreviewSummary(persona: CreatorAvatarForm): string {
  return [
    persona.displayName,
    String(persona.age),
    persona.location.split("+")[0]?.trim() ?? persona.location,
    persona.religion.split("•")[0]?.trim() ?? persona.religion,
  ].join(" • ");
}