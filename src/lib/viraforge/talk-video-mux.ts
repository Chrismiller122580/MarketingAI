import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { parseBuffer } from "music-metadata";

const execFileAsync = promisify(execFile);

async function fetchMediaBytes(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch media (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function getAudioDurationSec(buffer: Buffer): Promise<number> {
  const metadata = await parseBuffer(buffer, { mimeType: "audio/mpeg" });
  const duration = metadata.format.duration;
  if (!duration || !Number.isFinite(duration)) {
    throw new Error("Could not read audio duration");
  }
  return Math.round(duration * 1000) / 1000;
}

async function probeVideoDurationSec(videoPath: string): Promise<number> {
  if (!ffmpegPath) throw new Error("ffmpeg binary not available");

  try {
    await execFileAsync(ffmpegPath, ["-i", videoPath, "-f", "null", "-"], {
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr?: string }).stderr ?? "")
        : "";
    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  throw new Error("Could not probe video duration");
}

/**
 * Mux approved voice audio into SadTalker video and align duration to the audio
 * so lip-sync playback stays locked in the preview and exports.
 */
export async function muxTalkVideoWithVoice(
  videoUrl: string,
  audioUrl: string,
): Promise<{ buffer: Buffer; audioDurationSec: number; videoDurationSec: number }> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg is not available on this server");
  }

  const [videoBytes, audioBytes] = await Promise.all([
    fetchMediaBytes(videoUrl),
    fetchMediaBytes(audioUrl),
  ]);

  const audioDurationSec = await getAudioDurationSec(audioBytes);
  const workDir = await mkdtemp(join(tmpdir(), "talk-mux-"));
  const videoPath = join(workDir, "input.mp4");
  const audioPath = join(workDir, "voice.mp3");
  const outputPath = join(workDir, "output.mp4");

  try {
    await writeFile(videoPath, videoBytes);
    await writeFile(audioPath, audioBytes);

    const videoDurationSec = await probeVideoDurationSec(videoPath);
    const padSec = Math.max(0, audioDurationSec - videoDurationSec + 0.05);
    const trimSec = audioDurationSec;

    const filter =
      padSec > 0.1
        ? `[0:v]fps=25,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${padSec.toFixed(3)}[v]`
        : `[0:v]fps=25,setpts=PTS-STARTPTS,trim=duration=${trimSec.toFixed(3)},setpts=PTS-STARTPTS[v]`;

    await execFileAsync(
      ffmpegPath,
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
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        trimSec.toFixed(3),
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