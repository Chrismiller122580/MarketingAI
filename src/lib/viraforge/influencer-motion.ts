import { estimateMp3DurationSec, uploadVoiceover } from "@/lib/ai-voice";
import {
  ensureReplicateInputUrl,
  uploadImageBytesToReplicate,
} from "@/lib/media-url";
import { createModelPrediction } from "@/lib/replicate-client";
import { synthesizeSpeech } from "./elevenlabs";
import type { InfluencerMotionType } from "./influencer-assets";
import { buildMotionPrompt, buildTalkCloseupPrompt, buildWalkTalkPrompt } from "./motion-prompts";
import {
  KLING_LONG_DURATION_SEC,
  KLING_SPOKEN_NEGATIVE_PROMPT,
  sadtalkerInputFor,
} from "./talk-settings";
import type { PreparedMotionPortrait } from "./influencer-renders";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";

const SADTALKER_MODELS = ["cjwbw/sadtalker", "lucataco/sadtalker"] as const;
/** v2.1's upstream model (kling-v2-1) was discontinued. Try the live image-to-video models in order. */
const KLING_MODELS = [
  "kwaivgi/kling-v2.5-turbo-pro",
  "kwaivgi/kling-v2.6",
  "kwaivgi/kling-v3-video",
] as const;

function klingRetired(error: string): boolean {
  return /discontinued|no longer available|not found|404|unavailable|1203|unexpected token|not valid json|error page|timed out|bad gateway/i.test(
    error,
  );
}

async function startKlingPlate(input: {
  prompt: string;
  startImage: string;
  duration: number;
  negativePrompt?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
}): Promise<{ predictionId: string } | { error: string }> {
  let lastError = "Kling motion is unavailable right now.";
  for (const model of KLING_MODELS) {
    const base = {
      prompt: input.prompt,
      start_image: input.startImage,
      duration: input.duration,
      ...(input.negativePrompt
        ? { negative_prompt: input.negativePrompt }
        : {}),
    };
    let result = await createModelPrediction(
      model,
      input.aspectRatio ? { ...base, aspect_ratio: input.aspectRatio } : base,
    );
    if (
      "error" in result &&
      input.aspectRatio &&
      /aspect/i.test(result.error)
    ) {
      result = await createModelPrediction(model, base);
    }
    if (!("error" in result)) return result;
    lastError = result.error;
    if (!klingRetired(result.error)) return result;
  }
  return { error: lastError };
}

export type MotionStartResult =
  | {
      predictionId: string;
      voiceAudioUrl?: string;
      voiceId?: string;
      needsLipsync?: boolean;
      audioDriven?: boolean;
      plateDurationSec?: number;
      audioDurationSec?: number;
    }
  | { error: string };

export type PreparedTalkAudio = {
  audioDataUrl: string;
  voiceId: string;
};

async function klingReadyPortrait(
  portrait: PreparedMotionPortrait,
): Promise<{ bytes: Buffer; format: PreparedMotionPortrait["format"] }> {
  if (portrait.format.mime === "image/jpeg" || portrait.format.mime === "image/png") {
    return { bytes: portrait.bytes, format: portrait.format };
  }
  try {
    const sharp = (await import("sharp")).default;
    const bytes = await sharp(portrait.bytes).jpeg({ quality: 90 }).toBuffer();
    return { bytes, format: { mime: "image/jpeg", ext: "jpg" } };
  } catch {
    return { bytes: portrait.bytes, format: portrait.format };
  }
}

async function cropPortraitForSpeech(
  portrait: PreparedMotionPortrait,
): Promise<PreparedMotionPortrait> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(portrait.bytes).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 200 || height < 200) return portrait;
    // The saved portrait has the slogan on the right and a card at the bottom.
    // Keep the face and drop those graphics before the video is made.
    const left = Math.round(width * 0.06);
    const top = Math.round(height * 0.02);
    const cropWidth = Math.max(64, Math.round(width * 0.6));
    const cropHeight = Math.max(64, Math.round(height * 0.7));
    const bytes = await sharp(portrait.bytes)
      .extract({
        left,
        top,
        width: Math.min(cropWidth, width - left),
        height: Math.min(cropHeight, height - top),
      })
      .jpeg({ quality: 92 })
      .toBuffer();
    return { ...portrait, bytes, format: { mime: "image/jpeg", ext: "jpg" } };
  } catch {
    return portrait;
  }
}

function talkFrames(seconds?: number): number {
  const length = !seconds || seconds < 1 ? 8 : Math.min(10, seconds + 0.4);
  const raw = Math.round(length * 25);
  let snapped = Math.round((raw - 1) / 4) * 4 + 1;
  if (snapped < 81) snapped = 81;
  if (snapped > 241) snapped = 241;
  return snapped;
}

async function startAudioDrivenTalk(input: {
  imageUrl: string;
  audioUrl: string;
  seconds?: number;
}): Promise<{ predictionId: string } | { error: string }> {
  let audio = input.audioUrl;
  try {
    audio = await ensureReplicateInputUrl(input.audioUrl, "voice");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice upload failed";
    return { error: message };
  }

  return createModelPrediction("codehappynice/infinitetalk", {
    image: input.imageUrl,
    audio,
    prompt:
      "Close-up of this person speaking the audio to the camera. The face stays large. The mouth shapes every word. Natural blinks. No zoom out.",
    negative_prompt:
      "subtitles, captions, text, letters, logos, frozen smile, closed mouth, blurry face, extra fingers",
    num_frames: talkFrames(input.seconds),
    audio_guide_scale: 5,
    text_guide_scale: 4,
    resolution: "480",
    sampling_steps: 30,
  });
}

async function uploadPortraitToReplicate(
  portrait: PreparedMotionPortrait,
): Promise<string> {
  const ready = await klingReadyPortrait(portrait);
  return uploadImageBytesToReplicate(ready.bytes, ready.format, "portrait");
}

async function uploadVoiceToReplicate(audioDataUrl: string): Promise<string> {
  return ensureReplicateInputUrl(audioDataUrl, "voice");
}

function durationFromAudioDataUrl(audioDataUrl: string): number | undefined {
  try {
    const bytes = Buffer.from(
      audioDataUrl.replace(/^data:[^;]+;base64,/, ""),
      "base64",
    );
    const sec = estimateMp3DurationSec(bytes);
    return Number.isFinite(sec) && sec > 0 ? sec : undefined;
  } catch {
    return undefined;
  }
}

export async function startInfluencerMotion(
  motionType: InfluencerMotionType,
  portrait: PreparedMotionPortrait,
  persona: CreatorAvatarForm,
  script?: string,
  voiceId?: string,
  preparedTalk?: PreparedTalkAudio,
  languageCode?: string,
  options?: { aspectRatio?: "9:16" | "16:9" | "1:1" },
): Promise<MotionStartResult> {
  let imageUrl: string;
  try {
    const source =
      motionType === "talk" || motionType === "walk-talk"
        ? await cropPortraitForSpeech(portrait)
        : portrait;
    imageUrl = await uploadPortraitToReplicate(source);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Portrait upload failed";
    return { error: `Could not prepare portrait for motion: ${message}` };
  }

  if (motionType === "talk" || motionType === "walk-talk") {
    if (motionType === "talk" && !script?.trim()) {
      return { error: "Script is required for talking clips" };
    }

    let audioDataUrl: string | undefined;
    let usedVoiceId: string | undefined;
    let audioDurationSec: number | undefined;
    try {
      if (preparedTalk) {
        audioDataUrl = preparedTalk.audioDataUrl;
        usedVoiceId = preparedTalk.voiceId;
        audioDurationSec = durationFromAudioDataUrl(preparedTalk.audioDataUrl);
      } else if (script?.trim()) {
        const speech = await synthesizeSpeech(script.trim(), {
          voiceId,
          purpose: "talk",
          languageCode,
        });
        audioDataUrl = speech.audioDataUrl;
        usedVoiceId = speech.voiceId;
        audioDurationSec = speech.durationSec;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice synthesis failed";
      return { error: message };
    }

    let voiceAudioUrl: string | undefined;
    if (audioDataUrl) {
      const voiceBytes = Buffer.from(
        audioDataUrl.replace(/^data:[^;]+;base64,/, ""),
        "base64",
      );
      try {
        voiceAudioUrl =
          (await uploadVoiceover(voiceBytes)) ?? audioDataUrl;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Voice upload failed";
        return { error: `Could not prepare voiceover for motion: ${message}` };
      }
    }

    if (voiceAudioUrl) {
      const driven = await startAudioDrivenTalk({
        imageUrl,
        audioUrl: audioDataUrl ?? voiceAudioUrl,
        seconds: audioDurationSec,
      });
      if (!("error" in driven)) {
        return {
          predictionId: driven.predictionId,
          voiceAudioUrl,
          voiceId: usedVoiceId,
          needsLipsync: false,
          audioDriven: true,
          audioDurationSec,
        };
      }
      console.error("Audio-driven talk failed, using the older plate:", driven.error);
    }

    const plateDurationSec = KLING_LONG_DURATION_SEC;
    const frame =
      options?.aspectRatio === "9:16"
        ? " Vertical 9:16 phone video. Face fills the frame. No letterboxing."
        : "";
    const klingPrompt =
      (motionType === "talk"
        ? buildTalkCloseupPrompt(persona)
        : buildWalkTalkPrompt(persona)) + frame;
    const klingResult = await startKlingPlate({
      prompt: klingPrompt,
      startImage: imageUrl,
      duration: plateDurationSec,
      negativePrompt: KLING_SPOKEN_NEGATIVE_PROMPT,
      aspectRatio: options?.aspectRatio,
    });

    if (!("error" in klingResult)) {
      return {
        predictionId: klingResult.predictionId,
        voiceAudioUrl,
        voiceId: usedVoiceId,
        needsLipsync: Boolean(voiceAudioUrl),
        plateDurationSec,
        audioDurationSec,
      };
    }

    if (motionType === "walk-talk") {
      return klingResult;
    }

    if (!audioDataUrl) {
      return klingResult;
    }

    let audioUrl: string;
    try {
      audioUrl = await uploadVoiceToReplicate(audioDataUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice upload failed";
      return { error: `Could not prepare voiceover for motion: ${message}` };
    }

    let lastError = klingResult.error || "SadTalker lip-sync model unavailable";
    for (const model of SADTALKER_MODELS) {
      const result = await createModelPrediction(model, {
        source_image: imageUrl,
        driven_audio: audioUrl,
        ...sadtalkerInputFor(model),
      });

      if (!("error" in result)) {
        return {
          predictionId: result.predictionId,
          voiceAudioUrl,
          voiceId: usedVoiceId,
          needsLipsync: false,
          audioDurationSec,
        };
      }

      lastError = result.error;
      const retryable = /not found|404|unavailable/i.test(result.error);
      if (!retryable) return result;
    }

    return { error: lastError };
  }

  const prompt =
    buildMotionPrompt(persona, motionType) +
    (options?.aspectRatio === "9:16"
      ? " Vertical 9:16 phone video. Subject fills the frame."
      : "");
  const result = await startKlingPlate({
    prompt,
    startImage: imageUrl,
    duration: 5,
    negativePrompt: KLING_SPOKEN_NEGATIVE_PROMPT,
    aspectRatio: options?.aspectRatio,
  });

  if ("error" in result) return result;
  return { predictionId: result.predictionId };
}
