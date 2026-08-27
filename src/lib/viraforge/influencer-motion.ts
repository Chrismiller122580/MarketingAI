import { uploadVoiceover } from "@/lib/ai-voice";
import {
  ensureReplicateInputUrl,
  uploadImageBytesToReplicate,
} from "@/lib/media-url";
import { createModelPrediction } from "@/lib/replicate-client";
import { synthesizeSpeech } from "./elevenlabs";
import type { InfluencerMotionType } from "./influencer-assets";
import { buildMotionPrompt, buildWalkTalkPrompt } from "./motion-prompts";
import { SADTALKER_INPUT_DEFAULTS } from "./talk-settings";
import type { PreparedMotionPortrait } from "./influencer-renders";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";

const SADTALKER_MODELS = ["cjwbw/sadtalker", "lucataco/sadtalker"] as const;
const KLING_MODEL = "kwaivgi/kling-v2.1";

export type MotionStartResult =
  | {
      predictionId: string;
      voiceAudioUrl?: string;
      voiceId?: string;
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

  if (motionType === "talk") {
    if (!script?.trim()) {
      return { error: "Script is required for talking clips" };
    }

    let audioDataUrl: string;
    let usedVoiceId: string;
    try {
      if (preparedTalk) {
        audioDataUrl = preparedTalk.audioDataUrl;
        usedVoiceId = preparedTalk.voiceId;
      } else {
        const speech = await synthesizeSpeech(script.trim(), { voiceId });
        audioDataUrl = speech.audioDataUrl;
        usedVoiceId = speech.voiceId;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice synthesis failed";
      return { error: message };
    }

    const voiceBytes = Buffer.from(
      audioDataUrl.replace(/^data:[^;]+;base64,/, ""),
      "base64",
    );

    let audioUrl: string;
    let voiceAudioUrl: string;
    try {
      [audioUrl, voiceAudioUrl] = await Promise.all([
        uploadVoiceToReplicate(audioDataUrl),
        uploadVoiceover(voiceBytes).then((url) => url ?? audioDataUrl),
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice upload failed";
      return { error: `Could not prepare voiceover for motion: ${message}` };
    }

    let lastError = "SadTalker lip-sync model unavailable";
    for (const model of SADTALKER_MODELS) {
      const result = await createModelPrediction(model, {
        source_image: imageUrl,
        driven_audio: audioUrl,
        ...SADTALKER_INPUT_DEFAULTS,
      });

      if (!("error" in result)) {
        return {
          predictionId: result.predictionId,
          voiceAudioUrl,
          voiceId: usedVoiceId,
        };
      }

      lastError = result.error;
      const retryable = /not found|404|unavailable/i.test(result.error);
      if (!retryable) return result;
    }

    return { error: lastError };
  }

  const prompt =
    motionType === "walk-talk"
      ? buildWalkTalkPrompt(persona)
      : buildMotionPrompt(persona, motionType);
  const result = await createModelPrediction(KLING_MODEL, {
    prompt,
    start_image: imageUrl,
    duration: 5,
    mode: "standard",
    aspect_ratio: "9:16",
  });

  if ("error" in result) return result;
  return { predictionId: result.predictionId };
}
