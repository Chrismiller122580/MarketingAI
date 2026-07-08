import { createHash } from "crypto";
import type { VoiceSettings } from "@elevenlabs/elevenlabs-js/api/types/VoiceSettings";

export const TALK_TARGET_MIN_WORDS = 18;
export const TALK_TARGET_MAX_WORDS = 28;
export const TALK_HARD_MAX_WORDS = 35;
export const TALK_IDEAL_MIN_DURATION_SEC = 8;
export const TALK_IDEAL_MAX_DURATION_SEC = 15;
export const TALK_WARN_MAX_DURATION_SEC = 18;
/** Spoken pace for influencer talk clips (words per second). */
export const TALK_WORDS_PER_SECOND = 2.3;

export const TALK_VOICE_SETTINGS: VoiceSettings = {
  speed: 0.88,
  stability: 0.55,
  similarityBoost: 0.75,
  style: 0.2,
  useSpeakerBoost: true,
};

export const SADTALKER_INPUT_DEFAULTS: Record<string, unknown> = {
  still: true,
  preprocess: "crop",
  expression_scale: 0.85,
  enhancer: "gfpgan",
};

export type TalkCheckStatus = "pass" | "warn" | "fail";

export type TalkScriptAnalysis = {
  script: string;
  wordCount: number;
  estimatedDurationSec: number;
  scriptHash: string;
  lengthStatus: TalkCheckStatus;
  durationStatus: TalkCheckStatus;
  canRender: boolean;
  messages: string[];
};

export function hashTalkScript(script: string): string {
  return createHash("sha256")
    .update(script.trim().replace(/\s+/g, " "))
    .digest("hex")
    .slice(0, 16);
}

export function countTalkWords(script: string): number {
  return script.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateTalkDurationSec(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.round((wordCount / TALK_WORDS_PER_SECOND) * 10) / 10;
}

export function analyzeTalkScript(script: string): TalkScriptAnalysis {
  const trimmed = script.trim().replace(/\s+/g, " ");
  const wordCount = countTalkWords(trimmed);
  const estimatedDurationSec = estimateTalkDurationSec(wordCount);
  const messages: string[] = [];

  let lengthStatus: TalkCheckStatus = "pass";
  if (wordCount === 0) {
    lengthStatus = "fail";
    messages.push("Add a talking script before rendering.");
  } else if (wordCount > TALK_HARD_MAX_WORDS) {
    lengthStatus = "fail";
    messages.push(
      `Script is ${wordCount} words — max ${TALK_HARD_MAX_WORDS} for lip-sync. Use Shorten for lip-sync.`,
    );
  } else if (wordCount > TALK_TARGET_MAX_WORDS) {
    lengthStatus = "warn";
    messages.push(
      `Script is ${wordCount} words — aim for ${TALK_TARGET_MIN_WORDS}–${TALK_TARGET_MAX_WORDS} for natural pacing.`,
    );
  } else if (wordCount < TALK_TARGET_MIN_WORDS) {
    lengthStatus = "warn";
    messages.push(
      `Script is only ${wordCount} words — may feel very short on camera.`,
    );
  }

  let durationStatus: TalkCheckStatus = "pass";
  if (estimatedDurationSec > TALK_WARN_MAX_DURATION_SEC) {
    durationStatus = "fail";
    messages.push(
      `Estimated ~${estimatedDurationSec}s — keep under ${TALK_WARN_MAX_DURATION_SEC}s for realistic lip-sync.`,
    );
  } else if (estimatedDurationSec > TALK_IDEAL_MAX_DURATION_SEC) {
    durationStatus = "warn";
    messages.push(
      `Estimated ~${estimatedDurationSec}s — ideal talk clips are ${TALK_IDEAL_MIN_DURATION_SEC}–${TALK_IDEAL_MAX_DURATION_SEC}s.`,
    );
  }

  const canRender = lengthStatus !== "fail" && durationStatus !== "fail";

  return {
    script: trimmed,
    wordCount,
    estimatedDurationSec,
    scriptHash: hashTalkScript(trimmed),
    lengthStatus,
    durationStatus,
    canRender,
    messages,
  };
}

export function truncateTalkScript(script: string, maxWords = TALK_TARGET_MAX_WORDS): string {
  const words = script.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}