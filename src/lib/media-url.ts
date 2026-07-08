import { get } from "@vercel/blob";
import { getAppOrigin } from "./app-url";
import { extractBlobPathname } from "./display-media-url";
import {
  assertValidImageBytes,
  detectImageFormat,
  type DetectedImageFormat,
} from "./image-bytes";
import {
  getBlobToken,
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

async function readBlobBytes(
  pathname: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const token = getBlobToken();
  for (const access of ["private", "public"] as const) {
    const result = await get(pathname, {
      access,
      ...(token ? { token } : {}),
    });
    if (result?.statusCode !== 200 || !result.stream) continue;

    const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
    if (bytes.length === 0) continue;
    return { bytes, contentType: result.blob.contentType };
  }
  return null;
}

async function fetchMediaForPersistence(
  url: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const blobPathname = blobPathnameFromUrl(url);
  if (blobPathname) {
    const fromBlob = await readBlobBytes(blobPathname);
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
  if (contentType.includes("json")) {
    throw new Error(`Media URL returned JSON (${response.status})`);
  }
  return { bytes, contentType };
}

/** Loads and validates image bytes from blob, HTTPS, data, or Replicate URLs. */
export async function loadValidatedImageBytes(
  url: string,
  label = "Portrait",
): Promise<{ bytes: Buffer; format: DetectedImageFormat }> {
  let bytes: Buffer;
  let contentType: string;

  if (url.startsWith("data:")) {
    const parsed = parseDataUrl(url);
    bytes = parsed.bytes;
    contentType = parsed.mime;
  } else {
    const resolved = isNonPublicMediaUrl(url)
      ? url
      : resolvePublicMediaUrl(url);
    const fetched = await fetchMediaForPersistence(resolved);
    bytes = fetched.bytes;
    contentType = fetched.contentType;
  }

  if (bytes.length === 0) {
    throw new Error(`${label} is empty`);
  }

  const format = resolveImageUploadFormat(bytes, contentType, label);
  return { bytes, format };
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
    let { bytes, contentType } = await fetchMediaForPersistence(urlOrData);
    if (/\.(png|jpe?g|webp|gif)$/i.test(filename)) {
      const format = assertValidImageBytes(bytes, "Image");
      contentType = format.mime;
    }
    return uploadBytesToBlob(bytes, filename, contentType);
  }

  throw new Error("Unsupported media format");
}

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4")) return "mp4";
  return "bin";
}

function resolveImageUploadFormat(
  bytes: Buffer,
  contentType: string,
  label: string,
): DetectedImageFormat {
  const detected = detectImageFormat(bytes);
  if (detected) return detected;

  if (contentType.startsWith("image/")) {
    const ext = extensionForMime(contentType);
    if (ext !== "bin") {
      return { mime: contentType.split(";")[0].trim(), ext };
    }
  }

  return assertValidImageBytes(bytes, label);
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
  let bytes: Buffer;
  let contentType: string;

  if (urlOrData.startsWith("data:")) {
    const parsed = parseDataUrl(urlOrData);
    bytes = parsed.bytes;
    contentType = parsed.mime;
  } else if (
    urlOrData.startsWith("http://") ||
    urlOrData.startsWith("https://") ||
    urlOrData.startsWith("/") ||
    isNonPublicMediaUrl(urlOrData)
  ) {
    const fetched = await fetchMediaForPersistence(
      isNonPublicMediaUrl(urlOrData)
        ? urlOrData
        : resolvePublicMediaUrl(urlOrData),
    );
    bytes = fetched.bytes;
    contentType = fetched.contentType;
  } else {
    throw new Error(`Unsupported ${label} format for Replicate`);
  }

  if (bytes.length === 0) {
    throw new Error(`${label} is empty`);
  }

  const isPortrait = label === "portrait";
  const format = isPortrait
    ? resolveImageUploadFormat(bytes, contentType, label)
    : {
        mime: contentType.split(";")[0].trim() || "application/octet-stream",
        ext: extensionForMime(contentType),
      };

  const filename = `viraforge-${label}-${Date.now()}.${format.ext}`;
  return uploadBytesToReplicate(bytes, format.mime, filename);
}