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
import { hasLockedProductFacts } from "@/lib/schemas/product-facts-schema";
import { avatarLanguageLabel, normalizeAvatarLanguage } from "./avatar-language";

export type InfluencerScriptScene =
  | "intro"
  | "pitch"
  | "quote"
  | "cta"
  | "greet"
  | "tiktok";

const SCENE_HINTS: Record<InfluencerScriptScene, string> = {
  intro: "Who you are, from something that happened this week. One breath. Name the city or a person.",
  pitch: "Start with a moment you lived. Then one verified product fact only — name, price, or a single feature. Never invent one.",
  quote: "A line only this person would say, pulled from a real day. Not a slogan.",
  cta: "Point somewhere from the story you just lived. Warm. No 'link in bio'.",
  greet: "Say hello like you ran into one person, and mention where you are.",
  tiktok:
    "One or two short sentences, 16 to 22 words, in one language only. Open on a moment they lived and name one person or one place. No website, no FAQ, no menu, no product page, no second language, no hashtags.",
};

const TALK_SCENES = new Set<InfluencerScriptScene>([
  "intro",
  "pitch",
  "quote",
  "cta",
  "greet",
  "tiktok",
]);

const TIKTOK_MAX_WORDS = 22;
const PAGE_NOISE =
  /preguntas frecuentes|\bfaq\b|link in bio|https?:|\bmenu\b|compradores|unirse a/i;

function spokenClauses(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|,\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function clauseLanguage(text: string): "es" | "en" | "other" {
  const spanish =
    /\b(el|la|los|las|que|para|con|una|por|del|hoy|estoy|fui)\b/i.test(text);
  const english =
    /\b(the|and|with|that|this|from|at|my|we|watching|skipped)\b/i.test(text);
  if (spanish && !english) return "es";
  if (english && !spanish) return "en";
  return "other";
}

/** One language, no crawled page, short enough for a 10-second walk. */
export function keepSpokenLine(
  script: string,
  language: string,
  maxWords: number,
): string {
  const wanted = language === "es" ? "es" : language === "en" ? "en" : null;
  const clean = spokenClauses(script).filter((part) => !PAGE_NOISE.test(part));
  const matched = wanted
    ? clean.filter((part) => clauseLanguage(part) === wanted)
    : clean;
  const kept = (matched.length > 0 ? matched : clean).join(" ");
  const words = kept.split(/\s+/).filter(Boolean).slice(0, maxWords);
  if (words.length === 0) return "";
  const line = words.join(" ");
  return /[.!?]$/.test(line) ? line : `${line}.`;
}

export async function generateInfluencerScript(input: {
  persona: CreatorAvatarForm;
  facts: ProductFactsForm;
  scene: InfluencerScriptScene;
  siteDomain?: string;
  draftText?: string;
  personalization?: string;
  maxWords?: number;
  worldLife?: string;
  language?: string;
}): Promise<{
  script: string;
  validation: { valid: boolean; violations: string[] };
  wordCount: number;
  estimatedDurationSec: number;
}> {
  if (!hasAnyAiKey()) {
    throw new Error(
      "AI script writing isn't available right now. Try again in a moment.",
    );
  }

  const isTikTok = input.scene === "tiktok";
  const factsBlock = isTikTok ? "" : formatFactsForPrompt(input.facts);
  const sceneHint = SCENE_HINTS[input.scene];
  const maxWords = input.maxWords ?? (isTikTok ? TIKTOK_MAX_WORDS : TALK_TARGET_MAX_WORDS);
  const isTalkScene = TALK_SCENES.has(input.scene);
  const wordRule = isTikTok
    ? `16–${TIKTOK_MAX_WORDS} words, one language, one breath, about 8 seconds`
    : isTalkScene
      ? `${TALK_TARGET_MIN_WORDS}–${maxWords} words max, conversational pace, one breath (~8–10 seconds spoken)`
      : "40–90 words max";
  const factRule = isTikTok
    ? "This is not an ad. Do not mention a website, a page, a FAQ, a menu, or a product."
    : hasLockedProductFacts(input.facts)
      ? "ONLY mention verified product facts below. Never invent specs, prices, benefits, or health claims."
      : "No product facts are locked. Do not invent prices, specs, ingredients, or health claims. Keep the copy general.";

  const language = normalizeAvatarLanguage(input.language ?? "en");
  const languageRule = `- Write the entire script in ${avatarLanguageLabel(language)}. Do not switch language. Keep personal names as they are.`;

  const systemPrompt = `You write short spoken scripts for ${input.persona.displayName} (@${input.persona.handle}).
Voice: ${input.persona.personalityVoice}
Sample tone: "${input.persona.sampleQuote}"

STRICT RULES:
- ${factRule}
- Write for the mouth — natural speech, ${wordRule}.
- If a lived life is included, the first sentence is that life. Do not open with advice.
- Return ONLY the script text. No quotes, labels, or stage directions.
${languageRule}
${input.worldLife ? `\n${input.worldLife}` : ""}
${input.personalization ? `\n${input.personalization}` : ""}`;

  const userMessage = isTikTok
    ? `Scene: tiktok — ${sceneHint}
Speak only about the lived day above. One language. Stop after the moment.`
    : `${factsBlock}

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
  const spoken = isTikTok
    ? keepSpokenLine(script, language, maxWords)
    : script.slice(0, 500);
  const words = spoken.split(/\s+/).filter(Boolean);
  const capped =
    words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}.` : spoken;
  if (!capped.trim()) {
    throw new Error("AI returned an empty script");
  }
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
      "AI script writing isn't available right now. Try again in a moment.",
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

Shorten this ${currentWords}-word script for a 10-second lip-sync clip:

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