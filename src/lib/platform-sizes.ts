import type { Platform } from "./types";

export const PLATFORM_SIZES: Record<Platform, { width: number; height: number }> = {
  instagram: { width: 1080, height: 1080 },
  twitter: { width: 1200, height: 675 },
  linkedin: { width: 1200, height: 627 },
  facebook: { width: 1200, height: 630 },
  pinterest: { width: 1000, height: 1500 },
  email: { width: 1200, height: 630 },
};

export function getPlatformSize(platform: Platform) {
  return PLATFORM_SIZES[platform] ?? PLATFORM_SIZES.instagram;
}