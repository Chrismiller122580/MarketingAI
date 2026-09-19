import { isFreeSocialPlatform } from "./plans";
import type { Platform, PostHistorySnapshot, SiteData } from "./types";

export const WEEK_PACK_SIZE = 5;

export const WEEK_PACK_PROMPT =
  "This week's content pack: one publish-ready social post per day, unused site pages first, a distinct angle each day, no filler. Captions should be ready to schedule as-is.";

export function resolveWeekPackPlatforms(opts: {
  paid: boolean;
  preferred?: Platform[];
  topPlatform?: Platform;
}): Platform[] {
  const paidFallback: Platform[] = ["instagram", "facebook", "linkedin"];
  const freeFallback: Platform[] = ["facebook", "instagram"];
  let list = (
    opts.preferred?.length
      ? opts.preferred
      : opts.paid
        ? paidFallback
        : freeFallback
  ).slice();

  if (!opts.paid) {
    list = list.filter((p) => isFreeSocialPlatform(p));
    if (list.length === 0) list = [...freeFallback];
  }

  if (opts.topPlatform && list.includes(opts.topPlatform)) {
    list = [opts.topPlatform, ...list.filter((p) => p !== opts.topPlatform)];
  }

  return list;
}

export function unusedPagePaths(
  site: SiteData,
  existing: PostHistorySnapshot[],
): string[] {
  const used = new Set(
    existing
      .map((p) => p.sourcePage)
      .filter((p): p is string => Boolean(p)),
  );
  return site.pages.filter((p) => !used.has(p.path)).map((p) => p.path);
}

export function calendarDatePlus(offset: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
