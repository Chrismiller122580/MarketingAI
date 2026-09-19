import type { Platform } from "@/lib/types";
import type { InfluencerMotionType } from "./influencer-assets";
import { normalizeMotionTypeSelection } from "./motion-actions";

export const PRESENT_HANDOFF_KEY = "crawlspark:present-handoff";
export const PRESENT_HANDOFF_EVENT = "crawlspark-present-handoff";
const HANDOFF_MAX_AGE_MS = 60 * 60 * 1000;

export type PresentHandoffClip = {
  motionType: InfluencerMotionType;
  motionJobId: string;
  voiceAudioUrl?: string;
  script?: string;
};

export type PresentHandoff = {
  influencerId: string;
  displayName?: string;
  handle?: string;
  portraitUrl?: string;
  domain: string;
  pagePath: string;
  platform: Platform;
  draftText: string;
  script?: string;
  motionTypes: InfluencerMotionType[];
  clips: PresentHandoffClip[];
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function writePresentHandoff(payload: PresentHandoff): void {
  if (typeof window === "undefined") return;
  const next: PresentHandoff = {
    ...payload,
    motionTypes: normalizeMotionTypeSelection(payload.motionTypes),
    createdAt: payload.createdAt || new Date().toISOString(),
  };
  sessionStorage.setItem(PRESENT_HANDOFF_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(PRESENT_HANDOFF_EVENT));
}

export function readPresentHandoff(): PresentHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PRESENT_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    if (typeof parsed.influencerId !== "string" || !parsed.influencerId) {
      return null;
    }
    if (typeof parsed.draftText !== "string" || !parsed.draftText.trim()) {
      return null;
    }
    const createdAt =
      typeof parsed.createdAt === "string" ? parsed.createdAt : "";
    const createdMs = createdAt ? Date.parse(createdAt) : 0;
    if (!createdMs || Date.now() - createdMs > HANDOFF_MAX_AGE_MS) {
      sessionStorage.removeItem(PRESENT_HANDOFF_KEY);
      return null;
    }

    const clips = Array.isArray(parsed.clips)
      ? parsed.clips.filter(
          (clip): clip is PresentHandoffClip =>
            isRecord(clip) &&
            typeof clip.motionType === "string" &&
            typeof clip.motionJobId === "string",
        )
      : [];

    return {
      influencerId: parsed.influencerId,
      displayName:
        typeof parsed.displayName === "string" ? parsed.displayName : undefined,
      handle: typeof parsed.handle === "string" ? parsed.handle : undefined,
      portraitUrl:
        typeof parsed.portraitUrl === "string" ? parsed.portraitUrl : undefined,
      domain: typeof parsed.domain === "string" ? parsed.domain : "",
      pagePath: typeof parsed.pagePath === "string" ? parsed.pagePath : "/",
      platform: (typeof parsed.platform === "string"
        ? parsed.platform
        : "instagram") as Platform,
      draftText: parsed.draftText,
      script: typeof parsed.script === "string" ? parsed.script : undefined,
      motionTypes: normalizeMotionTypeSelection(
        parsed.motionTypes as InfluencerMotionType[] | undefined,
      ),
      clips,
      createdAt,
    };
  } catch {
    return null;
  }
}

export function clearPresentHandoff(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PRESENT_HANDOFF_KEY);
}

export function buildContentStudioHandoffUrl(handoff: {
  influencerId: string;
  domain: string;
  pagePath: string;
  platform?: Platform;
  motionTypes?: InfluencerMotionType[];
}): string {
  const params = new URLSearchParams({
    influencer: handoff.influencerId,
    domain: handoff.domain,
    page: handoff.pagePath || "/",
  });
  if (handoff.platform) params.set("platform", handoff.platform);
  if (handoff.motionTypes?.length) {
    params.set("motion", handoff.motionTypes.join(","));
  }
  return `/content?${params.toString()}`;
}
