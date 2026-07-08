import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  getInfluencerMotionJob,
  updateInfluencerMotionJob,
} from "@/lib/influencer-motion-jobs";
import { getPredictionStatus } from "@/lib/replicate-client";
import { finalizeInfluencerRender } from "@/lib/viraforge/influencer-renders";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const { jobId } = await context.params;
  const job = await getInfluencerMotionJob(jobId, authResult);
  if (!job) {
    return NextResponse.json({ error: "Motion job not found" }, { status: 404 });
  }

  if (job.status === "ready" && job.videoUrl) {
    return NextResponse.json({
      status: "ready",
      videoUrl: job.videoUrl,
      motionType: job.motionType,
      voiceAudioUrl: job.voiceAudioUrl,
      renderId: job.renderId,
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
    await updateInfluencerMotionJob(job.renderId, {
      status: "ready",
      videoUrl: prediction.outputUrl,
    });

    let videoUrl = prediction.outputUrl;
    if (job.renderId) {
      const render = await finalizeInfluencerRender({
        userId: authResult,
        influencerId: job.influencerId,
        renderId: job.renderId,
        status: "ready",
        url: prediction.outputUrl,
        voiceUrl: job.voiceAudioUrl,
        activate: true,
      });
      if (render?.url) videoUrl = render.url;
    }

    return NextResponse.json({
      status: "ready",
      videoUrl,
      motionType: job.motionType,
      voiceAudioUrl: job.voiceAudioUrl,
      renderId: job.renderId,
    });
  }

  if (prediction.status === "failed") {
    const error = prediction.error ?? "Motion generation failed";
    await updateInfluencerMotionJob(job.renderId, { status: "failed", error });
    if (job.renderId) {
      await finalizeInfluencerRender({
        userId: authResult,
        influencerId: job.influencerId,
        renderId: job.renderId,
        status: "failed",
        error,
      });
    }

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