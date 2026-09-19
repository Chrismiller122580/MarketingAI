import { createModelPrediction } from "@/lib/replicate-client";
import { ensureReplicateInputUrl } from "@/lib/media-url";

const LIPSYNC_MODELS = ["kwaivgi/kling-lip-sync", "sync/lipsync-2"] as const;

export type VideoLipsyncOptions = {
  motionType?: string;
  plateDurationSec?: number;
  audioDurationSec?: number;
};

function pickSyncMode(options?: VideoLipsyncOptions): string {
  const plate = options?.plateDurationSec;
  const audio = options?.audioDurationSec;
  if (
    typeof plate === "number" &&
    typeof audio === "number" &&
    Number.isFinite(plate) &&
    Number.isFinite(audio) &&
    audio <= plate + 0.4
  ) {
    return "cut_off";
  }
  return options?.motionType === "talk" ? "bounce" : "loop";
}

/**
 * Re-lip a Kling (or other) plate to approved voice audio.
 * Prefers Kling lip-sync on Kling footage, then Sync Labs lipsync-2.
 */
export async function startVideoLipsync(
  videoUrl: string,
  audioUrl: string,
  options?: VideoLipsyncOptions,
): Promise<{ predictionId: string } | { error: string }> {
  let video: string;
  let audio: string;
  try {
    [video, audio] = await Promise.all([
      ensureReplicateInputUrl(videoUrl, "walk-plate"),
      ensureReplicateInputUrl(audioUrl, "voice"),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not prepare lipsync media";
    return { error: message };
  }

  const klingResult = await createModelPrediction("kwaivgi/kling-lip-sync", {
    video_url: video,
    audio_file: audio,
  });
  if (!("error" in klingResult)) return klingResult;

  const syncResult = await createModelPrediction("sync/lipsync-2", {
    video,
    audio,
    sync_mode: pickSyncMode(options),
    temperature: 0.5,
    active_speaker: false,
  });
  if (!("error" in syncResult)) return syncResult;

  return {
    error: `Lip-sync unavailable (${LIPSYNC_MODELS.join(", ")}): ${klingResult.error}; ${syncResult.error}`,
  };
}
