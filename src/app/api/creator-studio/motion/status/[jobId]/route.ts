import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  getInfluencerMotionJob,
  updateInfluencerMotionJob,
} from "@/lib/influencer-motion-jobs";
import { getPredictionStatus } from "@/lib/replicate-client";
import { patchInfluencerAssets } from "@/lib/viraforge/influencer-db";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const { jobId } = await context.params;
  const job = getInfluencerMotionJob(jobId, authResult);
  if (!job) {
    return NextResponse.json({ error: "Motion job not found" }, { status: 404 });
  }

  if (job.status === "ready" && job.videoUrl) {
    return NextResponse.json({
      status: "ready",
      videoUrl: job.videoUrl,
      motionType: job.motionType,
      voiceAudioUrl: job.voiceAudioUrl,
    });
  }

  if (job.status === "failed") {
    return NextResponse.json({
      status: "failed",
      error: job.error ?? "Motion generation failed",
      motionType: job.motionType,
    });
  }

  const prediction = await getPredictionStatus(job.predictionId);
  if (!prediction) {
    return NextResponse.json(
      { error: "Failed to check motion status" },
      { status: 502 },
    );
  }

  if (prediction.status === "ready" && prediction.outputUrl) {
    updateInfluencerMotionJob(jobId, {
      status: "ready",
      videoUrl: prediction.outputUrl,
    });

    await patchInfluencerAssets(authResult, job.influencerId, {
      videoUrl: prediction.outputUrl,
      motionStatus: "ready",
      motionError: undefined,
      motionType: job.motionType,
      ...(job.voiceAudioUrl ? { voiceAudioUrl: job.voiceAudioUrl } : {}),
      ...(job.script ? { lastScript: job.script } : {}),
    });

    return NextResponse.json({
      status: "ready",
      videoUrl: prediction.outputUrl,
      motionType: job.motionType,
      voiceAudioUrl: job.voiceAudioUrl,
    });
  }

  if (prediction.status === "failed") {
    const error = prediction.error ?? "Motion generation failed";
    updateInfluencerMotionJob(jobId, { status: "failed", error });
    await patchInfluencerAssets(authResult, job.influencerId, {
      motionStatus: "failed",
      motionError: error,
    });

    return NextResponse.json({
      status: "failed",
      error,
      motionType: job.motionType,
    });
  }

  return NextResponse.json({
    status: "processing",
    motionType: job.motionType,
    voiceAudioUrl: job.voiceAudioUrl,
  });
}