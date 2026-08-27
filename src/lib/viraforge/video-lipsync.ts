import { createModelPrediction } from "@/lib/replicate-client";
import { ensureReplicateInputUrl } from "@/lib/media-url";

const LIPSYNC_MODELS = ["sync/lipsync-2", "kwaivgi/kling-lip-sync"] as const;

/**
 * Re-lip an existing video (walk plate, not a still) to approved voice audio.
 * Prefers Sync Labs on Replicate; falls back to Kling lip-sync.
 */
export async function startVideoLipsync(
  videoUrl: string,
  audioUrl: string,
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
    sync_mode: "loop",
    temperature: 0.4,
  });
  if (!("error" in syncResult)) return syncResult;

  const retryable = /not found|404|unavailable|unrecognized/i.test(
    syncResult.error,
  );
  if (!retryable) {
    // Still try Kling — some Sync errors are model-availability only.
  }

  const klingResult = await createModelPrediction("kwaivgi/kling-lip-sync", {
    video_url: video,
    audio_file: audio,
  });
  if (!("error" in klingResult)) return klingResult;

  return {
    error: `Lip-sync unavailable (${LIPSYNC_MODELS.join(", ")}): ${klingResult.error}`,
  };
}
