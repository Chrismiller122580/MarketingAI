import { put } from "@vercel/blob";
import { getAppOrigin } from "./app-url";
import type { PostMedia } from "./types";

export type BlobAccess = "public" | "private";

export function getBlobAccess(): BlobAccess {
  const configured = process.env.BLOB_ACCESS?.trim().toLowerCase();
  return configured === "public" ? "public" : "private";
}

export function getBlobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export function isBlobUrl(url: string): boolean {
  return /blob\.vercel-storage\.com/i.test(url);
}

export function isBlobServeUrl(url: string): boolean {
  return (
    url.startsWith("/api/media/blob?") || /\/api\/media\/blob\?/.test(url)
  );
}

export function isPrivateBlobUrl(url: string): boolean {
  return /\.private\.blob\.vercel-storage\.com/i.test(url);
}

export function extractBlobPathname(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!isBlobUrl(parsed.href)) return null;
    const pathname = parsed.pathname.replace(/^\/+/, "");
    return pathname || null;
  } catch {
    return null;
  }
}

/** Relative app URL that streams a private blob through our API route. */
export function blobServePath(pathname: string): string {
  return `/api/media/blob?pathname=${encodeURIComponent(pathname)}`;
}

/** Browser-safe URL for img/video/audio elements. */
export function resolveDisplayMediaUrl(url: string): string {
  if (!url) return url;

  if (url.startsWith("/api/media/blob?")) return url;

  const pathname = extractBlobPathname(url);
  if (pathname && isPrivateBlobUrl(url)) {
    return blobServePath(pathname);
  }

  return url;
}

/** Absolute HTTPS URL for social APIs and external fetchers (Replicate, Meta, etc.). */
export function resolvePublicMediaUrl(url: string): string {
  const display = resolveDisplayMediaUrl(url);
  if (display.startsWith("/")) return `${getAppOrigin()}${display}`;
  return display;
}

type UploadInput = Buffer | Blob | ArrayBuffer | ReadableStream | File;

export async function uploadToBlob(
  filename: string,
  data: UploadInput,
  contentType?: string,
): Promise<string> {
  const token = getBlobToken();
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required to store portraits and media for display",
    );
  }

  const access = getBlobAccess();
  const uploaded = await put(filename, data, {
    access,
    token,
    ...(contentType ? { contentType } : {}),
  });

  return access === "private"
    ? resolvePublicMediaUrl(uploaded.url)
    : uploaded.url;
}

export function resolvePostMedia(media: PostMedia): PostMedia {
  return {
    ...media,
    url: resolveDisplayMediaUrl(media.url),
    originalUrl: media.originalUrl
      ? resolveDisplayMediaUrl(media.originalUrl)
      : undefined,
    editedUrl: media.editedUrl
      ? resolveDisplayMediaUrl(media.editedUrl)
      : undefined,
    originalBaseUrl: media.originalBaseUrl
      ? resolveDisplayMediaUrl(media.originalBaseUrl)
      : undefined,
    videoUrl: media.videoUrl
      ? resolvePublicMediaUrl(media.videoUrl)
      : undefined,
    audioUrl: media.audioUrl
      ? resolveDisplayMediaUrl(media.audioUrl)
      : undefined,
  };
}