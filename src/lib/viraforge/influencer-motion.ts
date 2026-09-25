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
  KLING_SPOKEN_NEGATIVE_PROMPT,
  klingDurationForAudio,
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
  return /discontinued|no longer available|not found|404|unavailable|1203/i.test(
    error,
  );
}

async function startKlingPlate(input: {
  prompt: string;
  startImage: string;
  duration: number;
  negativePrompt?: string;
}): Promise<{ predictionId: string } | { error: string }> {
  let lastError = "Kling motion is unavailable right now.";
  for (const model of KLING_MODELS) {
    const result = await createModelPrediction(model, {
      prompt: input.prompt,
      start_image: input.startImage,
      duration: input.duration,
      ...(input.negativePrompt
        ? { negative_prompt: input.negativePrompt }
        : {}),
    });
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
      plateDurationSec?: number;
      audioDurationSec?: number;
    }
  | { error: string };

export type PreparedTalkAudio = {
  audioDataUrl: string;
  voiceId: string;
};

async function uploadPortraitToReplicate(
  portrait: PreparedMotionPortrait,
): Promise<string> {
  return uploadImageBytesToReplicate(
    portrait.bytes,
    portrait.format,
    "portrait",
  );
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
): Promise<MotionStartResult> {
  let imageUrl: string;
  try {
    imageUrl = await uploadPortraitToReplicate(portrait);
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
        const speech = await synthesizeSpeech(script.trim(), { voiceId, purpose: "talk" });
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

    const plateDurationSec = klingDurationForAudio(audioDurationSec);
    const klingPrompt =
      motionType === "talk"
        ? buildTalkCloseupPrompt(persona)
        : buildWalkTalkPrompt(persona);
    const klingResult = await startKlingPlate({
      prompt: klingPrompt,
      startImage: imageUrl,
      duration: plateDurationSec,
      negativePrompt: KLING_SPOKEN_NEGATIVE_PROMPT,
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

  const prompt = buildMotionPrompt(persona, motionType);
  const result = await startKlingPlate({
    prompt,
    startImage: imageUrl,
    duration: 5,
  });

  if ("error" in result) return result;
  return { predictionId: result.predictionId };
}
