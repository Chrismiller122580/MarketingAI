import type { InfluencerMotionType } from "./influencer-assets";
import type { InfluencerScriptScene } from "./influencer-script";

export type MotionAction = {
  type: InfluencerMotionType;
  label: string;
  description: string;
};

export const MOTION_ACTIONS: MotionAction[] = [
  {
    type: "talk",
    label: "Talk",
    description: "ElevenLabs voice + lip-sync talking clip",
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

export const MAX_CONTENT_STUDIO_MOTION_CLIPS = 2;

/** Map motion type + talk index to the best spoken-script scene for AI coordination. */
export function motionScriptScene(
  motionType: InfluencerMotionType,
  talkIndex = 0,
): InfluencerScriptScene | null {
  if (motionType === "talk") {
    return talkIndex === 0 ? "pitch" : talkIndex === 1 ? "cta" : "quote";
  }
  if (motionType === "wave") return "greet";
  if (motionType === "point") return "cta";
  return null;
}

export function normalizeMotionTypeSelection(
  types: InfluencerMotionType[] | undefined,
): InfluencerMotionType[] {
  if (!types?.length) return ["talk"];
  const seen = new Set<InfluencerMotionType>();
  const normalized: InfluencerMotionType[] = [];
  for (const type of types) {
    if (seen.has(type)) continue;
    seen.add(type);
    normalized.push(type);
    if (normalized.length >= MAX_CONTENT_STUDIO_MOTION_CLIPS) break;
  }
  return normalized;
}