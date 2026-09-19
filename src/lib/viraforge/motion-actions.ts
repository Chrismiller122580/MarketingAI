import type { InfluencerMotionType } from "./influencer-assets";
import type { InfluencerScriptScene } from "./influencer-script";

export type MotionAction = {
  type: InfluencerMotionType;
  label: string;
  description: string;
};

export const MOTION_ACTIONS: MotionAction[] = [
  {
    type: "walk-talk",
    label: "Walk & talk",
    description: "Walk their city while speaking — wider shot, synced voice",
  },
  {
    type: "talk",
    label: "Talk (close-up)",
    description: "Close-up talking head with matched voice and lip-sync",
  },
  {
    type: "walk",
    label: "Walk",
    description: "Natural forward walk from portrait",
  },
  {
    type: "spin",
    label: "Spin",
    description: "Smooth 360° turn",
  },
  {
    type: "jump",
    label: "Jump",
    description: "Energetic jump motion",
  },
  {
    type: "wave",
    label: "Wave",
    description: "Friendly hello to followers",
  },
  {
    type: "point",
    label: "Point",
    description: "Gesture toward camera / CTA",
  },
];

const MOTION_TYPE_SET = new Set<string>(MOTION_ACTIONS.map((action) => action.type));

export const MAX_CONTENT_STUDIO_MOTION_CLIPS = 2;
export const DEFAULT_PRESENT_MOTION_TYPES: InfluencerMotionType[] = ["walk-talk"];

/** Talk and walk-talk both need a script + ElevenLabs voice. */
export function isSpokenMotion(type: InfluencerMotionType): boolean {
  return type === "talk" || type === "walk-talk";
}

/** Map motion type + talk index to the best spoken-script scene for AI coordination. */
export function motionScriptScene(
  motionType: InfluencerMotionType,
  talkIndex = 0,
): InfluencerScriptScene | null {
  if (isSpokenMotion(motionType)) {
    return talkIndex === 0 ? "pitch" : talkIndex === 1 ? "cta" : "quote";
  }
  if (motionType === "wave") return "greet";
  if (motionType === "point") return "cta";
  return null;
}

export function isInfluencerMotionType(
  value: string,
): value is InfluencerMotionType {
  return MOTION_TYPE_SET.has(value);
}

export function normalizeMotionTypeSelection(
  types: InfluencerMotionType[] | undefined,
): InfluencerMotionType[] {
  if (!types?.length) return [...DEFAULT_PRESENT_MOTION_TYPES];
  const seen = new Set<InfluencerMotionType>();
  const normalized: InfluencerMotionType[] = [];
  for (const type of types) {
    if (!isInfluencerMotionType(type) || seen.has(type)) continue;
    seen.add(type);
    normalized.push(type);
    if (normalized.length >= MAX_CONTENT_STUDIO_MOTION_CLIPS) break;
  }
  return normalized.length > 0 ? normalized : [...DEFAULT_PRESENT_MOTION_TYPES];
}

export function parseMotionTypesParam(
  raw: string | null | undefined,
): InfluencerMotionType[] {
  if (!raw?.trim()) return [];
  const parsed = raw
    .split(",")
    .map((part) => part.trim())
    .filter(isInfluencerMotionType);
  return parsed.length > 0 ? normalizeMotionTypeSelection(parsed) : [];
}

export function motionTypesToParam(types: InfluencerMotionType[]): string {
  return normalizeMotionTypeSelection(types).join(",");
}

export function toggleMotionTypeSelection(
  current: InfluencerMotionType[],
  type: InfluencerMotionType,
): InfluencerMotionType[] {
  if (current.includes(type)) {
    return current.length === 1 ? current : current.filter((item) => item !== type);
  }
  if (current.length >= MAX_CONTENT_STUDIO_MOTION_CLIPS) {
    return [...current.slice(1), type];
  }
  return [...current, type];
}
