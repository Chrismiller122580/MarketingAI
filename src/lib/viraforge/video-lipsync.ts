import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { createModelPrediction } from "@/lib/replicate-client";
import { ensureReplicateInputUrl, loadStoredMediaBytes } from "@/lib/media-url";

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

const execFileAsync = promisify(execFile);

async function voiceWavDataUrl(audioUrl: string): Promise<string | null> {
  if (!ffmpegPath || !existsSync(ffmpegPath)) return null;
  const loaded = await loadStoredMediaBytes(audioUrl);
  if (!loaded.bytes.length) return null;
  const workDir = await mkdtemp(join(tmpdir(), "lipsync-wav-"));
  const inputPath = join(workDir, "voice.bin");
  const outputPath = join(workDir, "voice.wav");
  try {
    await writeFile(inputPath, loaded.bytes);
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "44100",
      outputPath,
    ]);
    const wav = await readFile(outputPath);
    if (!wav.length) return null;
    return `data:audio/wav;base64,${wav.toString("base64")}`;
  } catch (error) {
    console.error(
      "Could not convert voice to wav",
      error instanceof Error ? error.message : error,
    );
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
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
    video = await ensureReplicateInputUrl(videoUrl, "walk-plate");
    audio = await ensureReplicateInputUrl(audioUrl, "voice");
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

  let syncAudio = audio;
  try {
    const wav = await voiceWavDataUrl(audioUrl);
    if (wav) syncAudio = await ensureReplicateInputUrl(wav, "voice");
  } catch {
    syncAudio = audio;
  }

  const syncResult = await createModelPrediction("sync/lipsync-2", {
    video,
    audio: syncAudio,
    sync_mode: pickSyncMode(),
    temperature: 0.35,
    active_speaker: false,
  });
  if (!("error" in syncResult)) return syncResult;

  return {
    error: `Lip-sync unavailable (${LIPSYNC_MODELS.join(", ")}): ${klingResult.error}; ${syncResult.error}`,
  };
}
