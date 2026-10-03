import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { parseBuffer } from "music-metadata";
import { loadStoredMediaBytes } from "@/lib/media-url";

const execFileAsync = promisify(execFile);

function resolveFfmpegBin(): string {
  if (!ffmpegPath) {
    throw new Error("ffmpeg is not available on this server");
  }
  if (!existsSync(ffmpegPath)) {
    throw new Error(`ffmpeg binary missing at ${ffmpegPath}`);
  }
  return ffmpegPath;
}

async function fetchMediaBytes(url: string): Promise<Buffer> {
  const loaded = await loadStoredMediaBytes(url);
  if (!loaded.bytes.length) {
    throw new Error("Media file was empty");
  }
  return loaded.bytes;
}

export async function getAudioDurationSec(buffer: Buffer): Promise<number> {
  for (const mimeType of [undefined, "audio/mpeg", "audio/mp4", "audio/wav"]) {
    try {
      const metadata = await parseBuffer(
        buffer,
        mimeType ? { mimeType } : undefined,
      );
      const duration = metadata.format.duration;
      if (duration && Number.isFinite(duration) && duration > 0) {
        return Math.round(duration * 1000) / 1000;
      }
    } catch {
      /* try the next mime */
    }
  }
  throw new Error("Could not read audio duration");
}

async function probeVideoDurationSec(videoPath: string): Promise<number> {
  const bin = resolveFfmpegBin();

  const stderr = await new Promise<string>((resolve, reject) => {
    execFile(
      bin,
      ["-i", videoPath, "-f", "null", "-"],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, _stdout, errText) => {
        const text = String(errText ?? "");
        if (error && !/Duration:\s*\d+:\d+:\d+/.test(text)) {
          reject(error);
          return;
        }
        resolve(text);
      },
    );
  });

  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error("Could not probe video duration");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Mux approved voice audio into the talking-head video and align duration to the audio
 * so lip-sync playback stays locked in the preview and exports.
 */
export async function muxTalkVideoWithVoice(
  videoUrl: string,
  audioUrl: string,
): Promise<{ buffer: Buffer; audioDurationSec: number; videoDurationSec: number }> {
  const bin = resolveFfmpegBin();

  const [videoBytes, audioBytes] = await Promise.all([
    fetchMediaBytes(videoUrl),
    fetchMediaBytes(audioUrl),
  ]);

  const workDir = await mkdtemp(join(tmpdir(), "talk-mux-"));
  const videoPath = join(workDir, "input.mp4");
  const audioPath = join(workDir, "voice.mp3");
  const outputPath = join(workDir, "output.mp4");

  try {
    await writeFile(videoPath, videoBytes);
    await writeFile(audioPath, audioBytes);

    let audioDurationSec = 0;
    let videoDurationSec = 0;
    let trimSec: number | undefined;
    try {
      audioDurationSec = await getAudioDurationSec(audioBytes);
      videoDurationSec = await probeVideoDurationSec(videoPath);
      trimSec = Math.min(audioDurationSec, videoDurationSec);
    } catch {
      trimSec = undefined;
    }

    const filter = trimSec
      ? `[0:v]setpts=PTS-STARTPTS,trim=duration=${trimSec.toFixed(3)},setpts=PTS-STARTPTS[v];[1:a]atrim=duration=${trimSec.toFixed(3)},aresample=async=1:first_pts=0[a]`
      : `[0:v]setpts=PTS-STARTPTS[v];[1:a]aresample=async=1:first_pts=0[a]`;

    await execFileAsync(
      bin,
      [
        "-y",
        "-i",
        videoPath,
        "-i",
        audioPath,
        "-filter_complex",
        filter,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        ...(trimSec ? ["-t", trimSec.toFixed(3)] : ["-shortest"]),
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { maxBuffer: 20 * 1024 * 1024 },
    );

    const buffer = await readFile(outputPath);
    if (buffer.length === 0) {
      throw new Error("Mux produced an empty video file");
    }

    return { buffer, audioDurationSec, videoDurationSec };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
