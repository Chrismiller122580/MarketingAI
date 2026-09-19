import { createHash } from "crypto";
import type { VoiceSettings } from "@elevenlabs/elevenlabs-js/api/types/VoiceSettings";

export const TALK_TARGET_MIN_WORDS = 16;
export const TALK_TARGET_MAX_WORDS = 24;
export const TALK_HARD_MAX_WORDS = 30;
export const TALK_IDEAL_MIN_DURATION_SEC = 6;
export const TALK_IDEAL_MAX_DURATION_SEC = 11;
export const TALK_WARN_MAX_DURATION_SEC = 14;
/** Spoken pace for influencer talk clips (words per second). */
export const TALK_WORDS_PER_SECOND = 2.3;
export const KLING_SHORT_DURATION_SEC = 5;
export const KLING_LONG_DURATION_SEC = 10;

export const TALK_VOICE_SETTINGS: VoiceSettings = {
  speed: 0.9,
  stability: 0.48,
  similarityBoost: 0.8,
  style: 0.32,
  useSpeakerBoost: true,
};

export const KLING_SPOKEN_NEGATIVE_PROMPT =
  "frozen smile, closed mouth, silent, not speaking, distorted face, extra fingers, morphing identity, text overlay, watermark, subtitle, logo";

/** Kling v2.1 only accepts 5s or 10s. Pick the plate that can cover the voice. */
export function klingDurationForAudio(audioSec?: number): 5 | 10 {
  if (!audioSec || !Number.isFinite(audioSec) || audioSec <= 0) {
    return KLING_LONG_DURATION_SEC;
  }
  return audioSec > 6.2 ? KLING_LONG_DURATION_SEC : KLING_SHORT_DURATION_SEC;
}

/** lucataco/sadtalker uses still + enhancer; cjwbw uses still_mode + use_enhancer. */
export function sadtalkerInputFor(model: string): Record<string, unknown> {
  if (model.startsWith("cjwbw/")) {
    return {
      still_mode: false,
      preprocess: "crop",
      expression_scale: 1.2,
      use_enhancer: true,
      use_eyeblink: true,
      size_of_image: 512,
      pose_style: 4,
      facerender: "facevid2vid",
    };
  }
  return {
    still: false,
    preprocess: "crop",
    expression_scale: 1.2,
    enhancer: "gfpgan",
  };
}

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
      `Script is ${wordCount} words — aim for ${TALK_TARGET_MIN_WORDS}–${TALK_TARGET_MAX_WORDS} so it fits a 10s talking clip.`,
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
