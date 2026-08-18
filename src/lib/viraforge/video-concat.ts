import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { getAppOrigin } from "@/lib/app-url";

const execFileAsync = promisify(execFile);

const WIDTH = 720;
const HEIGHT = 1280;
const SCALE = `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,fps=25,setsar=1,format=yuv420p`;

function resolveMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, getAppOrigin()).toString();
}

async function fetchMediaBytes(url: string): Promise<Buffer> {
  const response = await fetch(resolveMediaUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to fetch clip (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function normalizeClip(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  if (!ffmpegPath) throw new Error("ffmpeg is not available on this server");

  const sharedOut = [
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-ac",
    "2",
    "-ar",
    "44100",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  try {
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        SCALE,
        "-af",
        "aresample=44100,aformat=channel_layouts=stereo",
        ...sharedOut,
      ],
      { maxBuffer: 40 * 1024 * 1024 },
    );
  } catch {
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-vf",
        SCALE,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-shortest",
        ...sharedOut,
      ],
      { maxBuffer: 40 * 1024 * 1024 },
    );
  }
}

/**
 * Stitch 2–6 motion clips into one vertical reel.
 * Re-encodes every clip so mixed sizes / missing audio still concat cleanly.
 */
export async function concatMotionVideos(urls: string[]): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg is not available on this server");
  }
  if (urls.length < 2) {
    throw new Error("Pick at least two clips to merge");
  }
  if (urls.length > 6) {
    throw new Error("Merge up to six clips at a time");
  }

  const workDir = await mkdtemp(join(tmpdir(), "avatar-reel-"));
  const outputPath = join(workDir, "reel.mp4");

  try {
    const normalized: string[] = [];

    for (const [index, url] of urls.entries()) {
      const bytes = await fetchMediaBytes(url);
      const inputPath = join(workDir, `in-${index}.mp4`);
      const normPath = join(workDir, `norm-${index}.mp4`);
      await writeFile(inputPath, bytes);
      await normalizeClip(inputPath, normPath);
      normalized.push(normPath);
    }

    const listPath = join(workDir, "list.txt");
    await writeFile(
      listPath,
      normalized.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join("\n"),
    );

    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { maxBuffer: 60 * 1024 * 1024 },
    );

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
