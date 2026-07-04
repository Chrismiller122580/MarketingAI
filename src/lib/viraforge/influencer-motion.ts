import { ensurePublicMediaUrl } from "@/lib/media-url";
import { createModelPrediction } from "@/lib/replicate-client";
import { synthesizeSpeech } from "./elevenlabs";
import type { InfluencerMotionType } from "./influencer-assets";
import { buildMotionPrompt } from "./motion-prompts";
import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";

const SADTALKER_MODEL = "cjwbw/sadtalker";
const KLING_MODEL = "kwaivgi/kling-v2.1";

export type MotionStartResult =
  | {
      predictionId: string;
      voiceAudioUrl?: string;
      voiceId?: string;
    }
  | { error: string };

export async function startInfluencerMotion(
  motionType: InfluencerMotionType,
  portraitUrl: string,
  persona: CreatorAvatarForm,
  script?: string,
): Promise<MotionStartResult> {
  const imageUrl = await ensurePublicMediaUrl(portraitUrl, "portrait");

  if (motionType === "talk") {
    if (!script?.trim()) {
      return { error: "Script is required for talking clips" };
    }

    const { audioDataUrl, voiceId } = await synthesizeSpeech(script.trim());
    const audioUrl = await ensurePublicMediaUrl(audioDataUrl, "voice");

    const result = await createModelPrediction(SADTALKER_MODEL, {
      source_image: imageUrl,
      driven_audio: audioUrl,
      enhancer: "gfpgan",
    });

    if ("error" in result) return result;

    return {
      predictionId: result.predictionId,
      voiceAudioUrl: audioDataUrl,
      voiceId,
    };
  }

  const prompt = buildMotionPrompt(persona, motionType);
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