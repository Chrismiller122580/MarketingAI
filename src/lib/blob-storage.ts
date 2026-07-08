import { put } from "@vercel/blob";
import { getAppOrigin } from "./app-url";
import {
  blobServePath,
  extractBlobPathname,
  isBlobServeUrl,
  isPrivateBlobUrl,
  resolveDisplayMediaUrl,
} from "./display-media-url";
import type { PostMedia } from "./types";

export {
  blobServePath,
  isBlobServeUrl,
  resolveDisplayMediaUrl,
} from "./display-media-url";

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

  if (access === "private") {
    const pathname = extractBlobPathname(uploaded.url);
    return pathname ? blobServePath(pathname) : uploaded.url;
  }

  return uploaded.url;
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