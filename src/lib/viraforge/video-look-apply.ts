import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { loadStoredMediaBytes, uploadBytesToBlob } from "@/lib/media-url";
import { renderPopupCard } from "./video-look-card";
import { LOOK_STICKERS, type LookStickerName } from "./video-look-stickers";
import { type VideoLookId } from "./video-looks";

const execFileAsync = promisify(execFile);

function ffmpegBin(): string {
  if (!ffmpegPath || !existsSync(ffmpegPath)) {
    throw new Error("ffmpeg is not available on this server");
  }
  return ffmpegPath;
}

function sticker(name: LookStickerName): Buffer {
  return Buffer.from(LOOK_STICKERS[name], "base64");
}

function filterFor(look: VideoLookId): string {
  const pop =
    "overlay=x=(W-w)/2:y='H-h-40+(1-min(1\\,(t-1.15)/0.32))*(h+40)':enable='gte(t\\,1.15)'";
  if (look === "promo") {
    return [
      "[0:v]eq=saturation=1.2:contrast=1.16:brightness=0.01[base]",
      "[1:v]scale=150:150[a]",
      "[2:v]scale=520:-1[card]",
      "[base][a]overlay=x=W-w-28:y='64+10*sin(2*PI*t/2.2)':enable='gte(t\\,0.35)'[v1]",
      `[v1][card]${pop}[v]`,
    ].join(";");
  }
  if (look === "street") {
    return [
      "[0:v]eq=saturation=0.82:contrast=1.08:brightness=-0.01[base]",
      "[1:v]scale=110:110[a]",
      "[2:v]scale=500:-1[card]",
      "[base][a]overlay=x=36:y='48+8*sin(2*PI*t/3)':enable='gte(t\\,0.25)'[v1]",
      `[v1][card]${pop}[v]`,
    ].join(";");
  }
  return [
    "[0:v]eq=saturation=1.32:contrast=1.07:brightness=0.025[base]",
    "[1:v]scale=128:128[a]",
    "[2:v]scale=116:116[b]",
    "[3:v]scale=120:120[c]",
    "[4:v]scale=520:-1[card]",
    "[base][a]overlay=x=28:y='56+16*sin(2*PI*t/2.6)':enable='gte(t\\,0.25)'[v1]",
    "[v1][b]overlay=x=W-w-36:y='96+14*sin(2*PI*t/2.1)':enable='between(t\\,0.7\\,7.5)'[v2]",
    "[v2][c]overlay=x=W-w-80:y='H*0.46+12*sin(2*PI*t/2.8)':enable='gte(t\\,1.5)'[v3]",
    `[v3][card]${pop}[v]`,
  ].join(";");
}

function stickerNames(look: VideoLookId): LookStickerName[] {
  if (look === "promo") return ["megaphone"];
  if (look === "street") return ["pin"];
  return ["spark", "fire", "heart"];
}

function cardLabel(look: VideoLookId): string {
  if (look === "promo") return "BOOK";
  if (look === "street") return "HERE";
  return "NEW";
}

export async function applyVideoLookToUrl(
  videoUrl: string,
  look: VideoLookId,
  line: string,
  blobPath: string,
): Promise<string> {
  if (look === "clean") return videoUrl;
  const loaded = await loadStoredMediaBytes(videoUrl);
  const styled = await applyVideoLook(loaded.bytes, look, line);
  return uploadBytesToBlob(styled, blobPath, "video/mp4");
}

export async function applyVideoLook(
  videoBytes: Buffer,
  look: VideoLookId,
  line: string,
): Promise<Buffer> {
  if (look === "clean") return videoBytes;
  const bin = ffmpegBin();
  const workDir = await mkdtemp(join(tmpdir(), "video-look-"));
  const inputPath = join(workDir, "in.mp4");
  const outputPath = join(workDir, "out.mp4");
  const names = stickerNames(look);
  try {
    await writeFile(inputPath, videoBytes);
    const stickerPaths: string[] = [];
    for (const name of names) {
      const path = join(workDir, `${name}.png`);
      await writeFile(path, sticker(name));
      stickerPaths.push(path);
    }
    const cardPath = join(workDir, "card.png");
    await writeFile(cardPath, renderPopupCard(cardLabel(look), line));

    const args = ["-y", "-i", inputPath];
    for (const path of stickerPaths) args.push("-loop", "1", "-i", path);
    args.push("-loop", "1", "-i", cardPath, "-filter_complex", filterFor(look), "-map", "[v]");

    let hasAudio = false;
    try {
      await execFileAsync(bin, ["-i", inputPath, "-hide_banner"], {
        maxBuffer: 1024 * 1024,
      });
    } catch (error) {
      const stderr = String((error as { stderr?: string }).stderr ?? "");
      hasAudio = /Audio:/.test(stderr);
    }
    if (hasAudio) {
      args.push("-map", "0:a", "-c:a", "copy");
    }
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-shortest",
      outputPath,
    );

    await execFileAsync(bin, args, { maxBuffer: 20 * 1024 * 1024 });
    const buffer = await readFile(outputPath);
    if (!buffer.length) throw new Error("Styled video was empty");
    return buffer;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
