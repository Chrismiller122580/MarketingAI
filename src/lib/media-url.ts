import { put } from "@vercel/blob";
import { getReplicateToken, uploadBytesToReplicate } from "./replicate-client";

export function isNonPublicMediaUrl(url: string): boolean {
  return /api\.replicate\.com\/v1\/files\//i.test(url);
}

async function fetchMediaForPersistence(
  url: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const headers: Record<string, string> = {};
  if (isNonPublicMediaUrl(url)) {
    const token = getReplicateToken();
    if (!token) {
      throw new Error(
        "Cannot copy Replicate file URLs without REPLICATE_API_TOKEN",
      );
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch media (${response.status})`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  return { bytes, contentType };
}

export async function uploadBytesToBlob(
  bytes: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required to store portraits and media for display",
    );
  }

  const uploaded = await put(filename, bytes, {
    access: "public",
    token: blobToken,
    contentType,
  });
  return uploaded.url;
}

/** Stores media in Vercel Blob so browsers and social previews can load it. */
export async function persistDisplayableMedia(
  urlOrData: string,
  filename: string,
): Promise<string> {
  if (urlOrData.startsWith("https://") && urlOrData.includes("blob.vercel-storage.com")) {
    return urlOrData;
  }

  if (urlOrData.startsWith("data:")) {
    const { mime, bytes } = parseDataUrl(urlOrData);
    return uploadBytesToBlob(bytes, filename, mime);
  }

  if (urlOrData.startsWith("http://") || urlOrData.startsWith("https://")) {
    const { bytes, contentType } = await fetchMediaForPersistence(urlOrData);
    return uploadBytesToBlob(bytes, filename, contentType);
  }

  throw new Error("Unsupported media format");
}

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