import { createModelPrediction } from "@/lib/replicate-client";
import { ensureReplicateInputUrl } from "@/lib/media-url";

const LIPSYNC_MODELS = ["kwaivgi/kling-lip-sync", "sync/lipsync-2"] as const;

export type VideoLipsyncOptions = {
  motionType?: string;
  plateDurationSec?: number;
  audioDurationSec?: number;
};

function pickSyncMode(): string {
  // Slow or speed the picture so the mouth covers the whole voice.
  // cut_off was dropping the end of the sentence when the plate was shorter.
  return "remap";
}

/**
 * Re-lip a plate to the voice.
 * Sync remap keeps the whole sentence and moves the mouth across it.
 * Kling lip-sync is the backup.
 */
export async function startVideoLipsync(
  videoUrl: string,
  audioUrl: string,
  _options?: VideoLipsyncOptions,
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

  const syncResult = await createModelPrediction("sync/lipsync-2", {
    video,
    audio,
    sync_mode: pickSyncMode(),
    temperature: 0.35,
    active_speaker: false,
  });
  if (!("error" in syncResult)) return syncResult;

  const klingResult = await createModelPrediction("kwaivgi/kling-lip-sync", {
    video_url: video,
    audio_file: audio,
  });
  if (!("error" in klingResult)) return klingResult;

  return {
    error: `Lip-sync unavailable (${LIPSYNC_MODELS.join(", ")}): ${syncResult.error}; ${klingResult.error}`,
  };
}
