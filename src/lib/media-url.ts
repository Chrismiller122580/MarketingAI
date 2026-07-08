import { get } from "@vercel/blob";
import { getAppOrigin } from "./app-url";
import { extractBlobPathname } from "./display-media-url";
import {
  isBlobServeUrl,
  isBlobUrl,
  resolvePublicMediaUrl,
  uploadToBlob,
} from "./blob-storage";
export { resolveDisplayMediaUrl } from "./display-media-url";
import { getReplicateToken, uploadBytesToReplicate } from "./replicate-client";

export { resolvePublicMediaUrl } from "./blob-storage";

export function isNonPublicMediaUrl(url: string): boolean {
  return /api\.replicate\.com\/v1\/files\//i.test(url);
}

function blobPathnameFromUrl(url: string): string | null {
  if (isBlobServeUrl(url)) {
    try {
      const parsed = new URL(url, getAppOrigin());
      return parsed.searchParams.get("pathname");
    } catch {
      return null;
    }
  }
  return extractBlobPathname(url);
}

async function readPrivateBlobBytes(
  pathname: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const result = await get(pathname, { access: "private" });
  if (result?.statusCode !== 200 || !result.stream) return null;

  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  return { bytes, contentType: result.blob.contentType };
}

async function fetchMediaForPersistence(
  url: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const blobPathname = blobPathnameFromUrl(url);
  if (blobPathname) {
    const fromBlob = await readPrivateBlobBytes(blobPathname);
    if (fromBlob) return fromBlob;
  }
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
  return uploadToBlob(filename, bytes, contentType);
}

/** Stores media in Vercel Blob so browsers and social previews can load it. */
export async function persistDisplayableMedia(
  urlOrData: string,
  filename: string,
): Promise<string> {
  if (isBlobServeUrl(urlOrData) || isBlobUrl(urlOrData)) {
    return resolvePublicMediaUrl(urlOrData);
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
    return resolvePublicMediaUrl(urlOrData);
  }

  if (!urlOrData.startsWith("data:")) {
    throw new Error(`Unsupported ${label} format`);
  }

  const { mime, bytes } = parseDataUrl(urlOrData);
  const ext = extensionForMime(mime);
  const filename = `viraforge-${label}-${Date.now()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      return await uploadToBlob(filename, bytes, mime);
    } catch {
      // fall through to Replicate
    }
  }

  return uploadBytesToReplicate(bytes, mime, filename);
}

/** Uploads media to Replicate Files so models can fetch inputs reliably. */
export async function ensureReplicateInputUrl(
  urlOrData: string,
  label: string,
): Promise<string> {
  if (isNonPublicMediaUrl(urlOrData)) {
    return urlOrData;
  }

  let bytes: Buffer;
  let contentType: string;

  if (urlOrData.startsWith("data:")) {
    const parsed = parseDataUrl(urlOrData);
    bytes = parsed.bytes;
    contentType = parsed.mime;
  } else if (
    urlOrData.startsWith("http://") ||
    urlOrData.startsWith("https://") ||
    urlOrData.startsWith("/")
  ) {
    const fetched = await fetchMediaForPersistence(
      resolvePublicMediaUrl(urlOrData),
    );
    bytes = fetched.bytes;
    contentType = fetched.contentType;
  } else {
    throw new Error(`Unsupported ${label} format for Replicate`);
  }

  const ext = extensionForMime(contentType);
  const filename = `viraforge-${label}-${Date.now()}.${ext}`;
  return uploadBytesToReplicate(bytes, contentType, filename);
}