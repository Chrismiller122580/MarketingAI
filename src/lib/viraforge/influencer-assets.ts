import { resolveDisplayMediaUrl } from "@/lib/display-media-url";

export type InfluencerMotionType =
  | "walk-talk"
  | "talk"
  | "walk"
  | "spin"
  | "jump"
  | "wave"
  | "point";

export type InfluencerAssets = {
  portraitUrl?: string;
  voiceAudioUrl?: string;
  videoUrl?: string;
  motionType?: InfluencerMotionType;
  motionJobId?: string;
  voiceId?: string;
  lastScript?: string;
  motionStatus?: "processing" | "ready" | "failed";
  motionError?: string;
};

export function mergeInfluencerAssets(
  prior: unknown,
  patch: Partial<InfluencerAssets>,
): InfluencerAssets {
  return { ...((prior ?? {}) as InfluencerAssets), ...patch };
}

export function resolveInfluencerAssets(
  assets: InfluencerAssets,
): InfluencerAssets {
  return {
    ...assets,
    portraitUrl: assets.portraitUrl
      ? resolveDisplayMediaUrl(assets.portraitUrl)
      : undefined,
    voiceAudioUrl: assets.voiceAudioUrl
      ? resolveDisplayMediaUrl(assets.voiceAudioUrl)
      : undefined,
    videoUrl: assets.videoUrl
      ? resolveDisplayMediaUrl(assets.videoUrl)
      : undefined,
  };
}
