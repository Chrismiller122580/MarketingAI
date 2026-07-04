import { put } from "@vercel/blob";
import { uploadBytesToReplicate } from "./replicate-client";

function extensionForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4")) return "mp4";
  return "bin";
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1] || "application/octet-stream";
  const bytes = Buffer.from(match[2], "base64");
  return { mime, bytes };
}

/** Ensures Replicate and other providers can fetch the media via HTTPS. */
export async function ensurePublicMediaUrl(
  urlOrData: string,
  label: string,
): Promise<string> {
  if (urlOrData.startsWith("http://") || urlOrData.startsWith("https://")) {
    return urlOrData;
  }

  if (!urlOrData.startsWith("data:")) {
    throw new Error(`Unsupported ${label} format`);
  }

  const { mime, bytes } = parseDataUrl(urlOrData);
  const ext = extensionForMime(mime);
  const filename = `viraforge-${label}-${Date.now()}.${ext}`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    const uploaded = await put(filename, bytes, {
      access: "public",
      token: blobToken,
      contentType: mime,
    });
    return uploaded.url;
  }

  return uploadBytesToReplicate(bytes, mime, filename);
}