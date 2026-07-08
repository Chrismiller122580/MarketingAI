import { chatCompletion, hasAnyAiKey } from "@/lib/ai-client";
import { validateQuoteAgainstFacts, formatFactsForPrompt } from "./claim-validator";
import {
  TALK_HARD_MAX_WORDS,
  TALK_TARGET_MAX_WORDS,
  TALK_TARGET_MIN_WORDS,
  analyzeTalkScript,
  countTalkWords,
} from "./talk-settings";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";

export type InfluencerScriptScene =
  | "intro"
  | "pitch"
  | "quote"
  | "cta"
  | "greet";

const SCENE_HINTS: Record<InfluencerScriptScene, string> = {
  intro: "Introduce yourself briefly. Who you are and your vibe — one breath.",
  pitch: "Pitch the verified product naturally in one breath. Mention name, price, and 1 feature only.",
  quote: "Deliver a punchy line in the influencer's signature voice — conversational, not salesy.",
  cta: "Short call-to-action pointing people to learn more. Warm and authentic.",
  greet: "Friendly greeting — wave hello to new followers.",
};

const TALK_SCENES = new Set<InfluencerScriptScene>([
  "intro",
  "pitch",
  "quote",
  "cta",
  "greet",
]);

export async function generateInfluencerScript(input: {
  persona: CreatorAvatarForm;
  facts: ProductFactsForm;
  scene: InfluencerScriptScene;
  siteDomain?: string;
  draftText?: string;
  personalization?: string;
  maxWords?: number;
}): Promise<{
  script: string;
  validation: { valid: boolean; violations: string[] };
  wordCount: number;
  estimatedDurationSec: number;
}> {
  if (!hasAnyAiKey()) {
    throw new Error(
      "AI script writing requires OPENAI_API_KEY or XAI_API_KEY.",
    );
  }

  const factsBlock = formatFactsForPrompt(input.facts);
  const sceneHint = SCENE_HINTS[input.scene];
  const maxWords = input.maxWords ?? TALK_TARGET_MAX_WORDS;
  const isTalkScene = TALK_SCENES.has(input.scene);
  const wordRule = isTalkScene
    ? `${TALK_TARGET_MIN_WORDS}–${maxWords} words max, conversational pace, one breath (~8–12 seconds spoken)`
    : "40–90 words max";

  const systemPrompt = `You write short spoken scripts for ${input.persona.displayName} (@${input.persona.handle}).
Voice: ${input.persona.personalityVoice}
Sample tone: "${input.persona.sampleQuote}"

STRICT RULES:
- ONLY mention verified product facts below. Never invent specs, prices, benefits, or health claims.
- Write for the mouth — natural speech, ${wordRule}.
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
  const trimmed = script.slice(0, 500);
  const words = trimmed.split(/\s+/).filter(Boolean);
  const capped =
    words.length > maxWords ? words.slice(0, maxWords).join(" ") : trimmed;
  const analysis = analyzeTalkScript(capped);

  return {
    script: capped,
    validation,
    wordCount: analysis.wordCount,
    estimatedDurationSec: analysis.estimatedDurationSec,
  };
}

export async function shortenInfluencerScriptForTalk(input: {
  persona: CreatorAvatarForm;
  facts: ProductFactsForm;
  script: string;
  personalization?: string;
}): Promise<{
  script: string;
  validation: { valid: boolean; violations: string[] };
  wordCount: number;
  estimatedDurationSec: number;
}> {
  if (!hasAnyAiKey()) {
    throw new Error(
      "AI script writing requires OPENAI_API_KEY or XAI_API_KEY.",
    );
  }

  const factsBlock = formatFactsForPrompt(input.facts);
  const currentWords = countTalkWords(input.script);

  const systemPrompt = `You compress spoken scripts for ${input.persona.displayName} (@${input.persona.handle}) for lip-sync video.
Voice: ${input.persona.personalityVoice}

STRICT RULES:
- ONLY keep verified product facts. Never invent claims.
- Output ${TALK_TARGET_MIN_WORDS}–${TALK_TARGET_MAX_WORDS} words (hard max ${TALK_HARD_MAX_WORDS}).
- One breath, conversational pace, natural for the mouth.
- Return ONLY the shortened script. No quotes or stage directions.
${input.personalization ? `\n${input.personalization}` : ""}`;

  const userMessage = `${factsBlock}

Shorten this ${currentWords}-word script for SadTalker lip-sync:

${input.script.trim()}`;

  const raw =
    (await chatCompletion(systemPrompt, userMessage, {
      maxTokens: 160,
      temperature: 0.4,
    })) ?? "";

  const shortened = raw.trim().replace(/^["']|["']$/g, "");
  if (!shortened) {
    throw new Error("AI returned an empty shortened script");
  }

  const validation = validateQuoteAgainstFacts(shortened, input.facts);
  const analysis = analyzeTalkScript(shortened);

  return {
    script: analysis.script,
    validation,
    wordCount: analysis.wordCount,
    estimatedDurationSec: analysis.estimatedDurationSec,
  };
}