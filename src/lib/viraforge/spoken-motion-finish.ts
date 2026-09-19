import { resolveDisplayMediaUrl } from "@/lib/display-media-url";
import type { InfluencerMotionJob } from "@/lib/influencer-motion-jobs";
import { updateInfluencerMotionJob } from "@/lib/influencer-motion-jobs";
import { uploadBytesToBlob } from "@/lib/media-url";
import { muxTalkVideoWithVoice } from "./talk-video-mux";
import { startVideoLipsync } from "./video-lipsync";
import { isSpokenMotion } from "./motion-actions";

function motionMeta(job: InfluencerMotionJob): Record<string, unknown> {
  return job.metadata && typeof job.metadata === "object" ? { ...job.metadata } : {};
}

function metaNumber(meta: Record<string, unknown>, key: string): number | undefined {
  const value = meta[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function needsSpokenLipsync(job: InfluencerMotionJob): boolean {
  if (!isSpokenMotion(job.motionType)) return false;
  if (!job.voiceAudioUrl) return false;
  const stage = motionMeta(job).lipsyncStage;
  return stage !== "done" && stage !== "skipped";
}

export async function startSpokenLipsyncStage(
  job: InfluencerMotionJob,
  plateVideoUrl: string,
): Promise<InfluencerMotionJob | { error: string }> {
  const meta = motionMeta(job);
  if (meta.lipsyncStage === "running" || meta.lipsyncStage === "done") {
    return job;
  }

  const locked = await updateInfluencerMotionJob(job.renderId, {
    videoUrl: plateVideoUrl,
    metadata: { ...meta, lipsyncStage: "running", plateVideoUrl },
  });
  if (!locked) return { error: "Motion job not found" };

  const voiceUrl = resolveDisplayMediaUrl(job.voiceAudioUrl ?? "");
  const lipsync = await startVideoLipsync(plateVideoUrl, voiceUrl, {
    motionType: job.motionType,
    plateDurationSec: metaNumber(meta, "plateDurationSec"),
    audioDurationSec: metaNumber(meta, "audioDurationSec"),
  });
  if ("error" in lipsync) {
    await updateInfluencerMotionJob(job.renderId, {
      metadata: {
        ...motionMeta(locked),
        lipsyncStage: "skipped",
        lipsyncError: lipsync.error,
        plateVideoUrl,
      },
    });
    return { error: lipsync.error };
  }

  const next = await updateInfluencerMotionJob(job.renderId, {
    predictionId: lipsync.predictionId,
    metadata: {
      ...motionMeta(locked),
      lipsyncStage: "running",
      plateVideoUrl,
      lipsyncPredictionId: lipsync.predictionId,
    },
  });
  return next ?? locked;
}

export async function muxSpokenVoice(
  userId: string,
  influencerId: string,
  renderId: string,
  videoUrl: string,
  voiceAudioUrl: string,
): Promise<string> {
  const voiceUrl = resolveDisplayMediaUrl(voiceAudioUrl);
  const muxed = await muxTalkVideoWithVoice(videoUrl, voiceUrl);
  return uploadBytesToBlob(
    muxed.buffer,
    `influencers/${userId}/${influencerId}/talk-mux-${renderId}.mp4`,
    "video/mp4",
  );
}
