import { chatCompletion, hasAnyAiKey } from "@/lib/ai-client";
import { validateQuoteAgainstFacts, formatFactsForPrompt } from "./claim-validator";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";

export type InfluencerScriptScene =
  | "intro"
  | "pitch"
  | "quote"
  | "cta"
  | "greet";

const SCENE_HINTS: Record<InfluencerScriptScene, string> = {
  intro: "Introduce yourself in 2–3 sentences. Who you are, your vibe, and why followers should listen.",
  pitch: "Pitch the verified product naturally in 3–4 sentences. Mention name, price, and 1–2 features only.",
  quote: "Deliver a punchy line in the influencer's signature voice — conversational, not salesy.",
  cta: "Short call-to-action (2 sentences) pointing people to learn more. Warm and authentic.",
  greet: "Friendly greeting in 1–2 sentences — wave hello to new followers.",
};

export async function generateInfluencerScript(input: {
  persona: CreatorAvatarForm;
  facts: ProductFactsForm;
  scene: InfluencerScriptScene;
  siteDomain?: string;
  draftText?: string;
  personalization?: string;
}): Promise<{ script: string; validation: { valid: boolean; violations: string[] } }> {
  if (!hasAnyAiKey()) {
    throw new Error(
      "AI script writing requires OPENAI_API_KEY or XAI_API_KEY.",
    );
  }

  const factsBlock = formatFactsForPrompt(input.facts);
  const sceneHint = SCENE_HINTS[input.scene];

  const systemPrompt = `You write short spoken scripts for ${input.persona.displayName} (@${input.persona.handle}).
Voice: ${input.persona.personalityVoice}
Sample tone: "${input.persona.sampleQuote}"

STRICT RULES:
- ONLY mention verified product facts below. Never invent specs, prices, benefits, or health claims.
- Write for the mouth — natural speech, 40–90 words max.
- Return ONLY the script text. No quotes, labels, or stage directions.
${input.personalization ? `\n${input.personalization}` : ""}`;

  const userMessage = `${factsBlock}

Scene: ${input.scene} — ${sceneHint}
${input.siteDomain ? `Website to reference: ${input.siteDomain}` : ""}
${input.draftText ? `Adapt this draft post into spoken script:\n${input.draftText}` : ""}`;

  const raw =
    (await chatCompletion(systemPrompt, userMessage, {
      maxTokens: 200,
      temperature: 0.6,
    })) ?? "";

  const script = raw.trim().replace(/^["']|["']$/g, "");
  if (!script) {
    throw new Error("AI returned an empty script");
  }

  const validation = validateQuoteAgainstFacts(script, input.facts);
  return { script: script.slice(0, 500), validation };
}