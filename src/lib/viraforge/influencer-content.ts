import { chatCompletion, hasAnyAiKey } from "@/lib/ai-client";
import { platformCopyHint } from "@/lib/business-context";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";
import type { Platform, SiteData, SitePage } from "@/lib/types";
import {
  validateQuoteAgainstFacts,
  formatFactsForPrompt,
} from "./claim-validator";
import type { FactPinpoint } from "./site-facts-extractor";

export type InfluencerSiteContentResult = {
  text: string;
  platform: Platform;
  citedFacts: FactPinpoint[];
  validation: { valid: boolean; violations: string[] };
  sourcePage: string;
  siteDomain: string;
};

function detectCitedFacts(
  text: string,
  pinpoints: FactPinpoint[],
): FactPinpoint[] {
  const lower = text.toLowerCase();
  return pinpoints.filter((pin) => {
    const needle = pin.fact.toLowerCase();
    if (needle.length >= 8 && lower.includes(needle)) return true;
    if (pin.category === "price" && pin.fact && lower.includes(pin.fact.replace(/\s/g, "").toLowerCase())) {
      return true;
    }
    const words = needle.split(/\s+/).filter((w) => w.length > 4);
    if (words.length === 0) return false;
    const hits = words.filter((w) => lower.includes(w)).length;
    return hits >= Math.min(2, words.length);
  });
}

export async function generateInfluencerSiteContent(input: {
  persona: CreatorAvatarForm;
  facts: ProductFactsForm;
  pinpoints: FactPinpoint[];
  site: SiteData;
  page: SitePage;
  platform: Platform;
  brief?: string;
}): Promise<InfluencerSiteContentResult> {
  if (!hasAnyAiKey()) {
    throw new Error(
      "AI copy unavailable. Add OPENAI_API_KEY or XAI_API_KEY.",
    );
  }

  const platformHint = platformCopyHint(input.platform);
  const factsBlock = formatFactsForPrompt(input.facts);
  const pinpointList = input.pinpoints
    .map((p) => `- [${p.category}] ${p.fact} (source: ${p.source})`)
    .join("\n");

  const systemPrompt = `You are ${input.persona.displayName}, social handle @${input.persona.handle}.
Voice and personality: ${input.persona.personalityVoice}
Sample tone: "${input.persona.sampleQuote}"

Write as this influencer promoting content for the crawled website ${input.site.domain}.
Platform: ${input.platform}. Style: ${platformHint}

STRICT RULES:
- ONLY cite product facts from the verified list below. Never invent specs, prices, health claims, or benefits.
- Weave in 2–4 specific verified facts naturally (name, price, features, location, hours, ingredients).
- Sound like the influencer's authentic voice — not generic marketing.
- Include a soft CTA pointing to ${input.site.domain}${input.page.path === "/" ? "" : input.page.path}
- Return ONLY the post copy. No explanations.`;

  const userMessage = `Crawled page: ${input.page.title}
URL: ${input.site.domain}${input.page.path}
Page summary: ${input.page.description || input.page.excerpt.slice(0, 280)}
Brand: ${input.site.brand.name} — ${input.site.brand.tagline || input.site.brand.tone}

${factsBlock}

Pinpointed facts you may reference:
${pinpointList}
${input.brief ? `\nCampaign brief: ${input.brief}` : ""}`;

  const text =
    (await chatCompletion(systemPrompt, userMessage, {
      maxTokens: 500,
      temperature: 0.65,
    })) ?? "";

  if (!text.trim()) {
    throw new Error("AI returned empty content");
  }

  const validation = validateQuoteAgainstFacts(text, input.facts);
  const citedFacts = detectCitedFacts(text, input.pinpoints);

  return {
    text: text.trim(),
    platform: input.platform,
    citedFacts,
    validation,
    sourcePage: input.page.path,
    siteDomain: input.site.domain,
  };
}