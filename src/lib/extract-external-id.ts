import type { Platform } from "./types";

export function extractExternalId(
  platform: Platform,
  publishUrl?: string | null,
): string | null {
  if (!publishUrl) return null;

  switch (platform) {
    case "twitter": {
      const m = publishUrl.match(/status\/(\d+)/);
      return m?.[1] ?? null;
    }
    case "facebook": {
      const m = publishUrl.match(/facebook\.com\/(\d+)/);
      return m?.[1] ?? null;
    }
    case "instagram": {
      const m = publishUrl.match(/instagram\.com\/p\/([^/?#]+)/);
      return m?.[1] ?? null;
    }
    case "pinterest": {
      const m = publishUrl.match(/pin\/(\d+)/);
      return m?.[1] ?? null;
    }
    case "linkedin":
    case "email":
      return null;
    default:
      return null;
  }
}