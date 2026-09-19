import { NextResponse } from "next/server";
import { resolveDisplayMediaUrl } from "@/lib/display-media-url";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  getInfluencerMotionJob,
  updateInfluencerMotionJob,
} from "@/lib/influencer-motion-jobs";
import { getPredictionStatus } from "@/lib/replicate-client";
import { finalizeInfluencerRender } from "@/lib/viraforge/influencer-renders";
import { isSpokenMotion } from "@/lib/viraforge/motion-actions";
import {
  muxSpokenVoice,
  needsSpokenLipsync,
  startSpokenLipsyncStage,
} from "@/lib/viraforge/spoken-motion-finish";

export const maxDuration = 120;
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const { jobId } = await context.params;
  const job = await getInfluencerMotionJob(jobId, authResult);
  if (!job) {
    return NextResponse.json({ error: "Motion job not found" }, { status: 404 });
  }

  const spoken = isSpokenMotion(job.motionType);

  if (job.status === "ready" && job.videoUrl) {
    return NextResponse.json({
      status: "ready",
      videoUrl: resolveDisplayMediaUrl(job.videoUrl),
      motionType: job.motionType,
      audioEmbeddedInVideo: spoken,
      voiceAudioUrl:
        spoken
          ? undefined
          : job.voiceAudioUrl
            ? resolveDisplayMediaUrl(job.voiceAudioUrl)
            : undefined,
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
    let videoUrl = prediction.outputUrl;
    const meta = job.metadata ?? {};
    const lipsyncStage = meta.lipsyncStage;

    if (needsSpokenLipsync(job) && lipsyncStage !== "running") {
      const advanced = await startSpokenLipsyncStage(job, prediction.outputUrl);
      if (!("error" in advanced)) {
        return NextResponse.json({
          status: "processing",
          motionType: job.motionType,
          voiceAudioUrl: job.voiceAudioUrl
            ? resolveDisplayMediaUrl(job.voiceAudioUrl)
            : undefined,
        });
      }
      // Lip-sync model unavailable — mux voice onto the plate instead of failing.
      videoUrl =
        typeof meta.plateVideoUrl === "string"
          ? meta.plateVideoUrl
          : prediction.outputUrl;
    }

    let audioEmbeddedInVideo = false;
    if (spoken && job.voiceAudioUrl) {
      try {
        videoUrl = await muxSpokenVoice(
          authResult,
          job.influencerId,
          job.renderId,
          videoUrl,
          job.voiceAudioUrl,
        );
        audioEmbeddedInVideo = true;
      } catch (error) {
        console.error(
          "Talk mux failed — using raw motion output:",
          error instanceof Error ? error.message : error,
        );
      }
    }

    if (job.renderId) {
      const render = await finalizeInfluencerRender({
        userId: authResult,
        influencerId: job.influencerId,
        renderId: job.renderId,
        status: "ready",
        url: videoUrl,
        voiceUrl: job.voiceAudioUrl,
        activate: true,
      });
      if (render?.url) videoUrl = render.url;
      await updateInfluencerMotionJob(job.renderId, {
        status: "ready",
        videoUrl,
        metadata: { ...meta, lipsyncStage: "done" },
      });
    }

    return NextResponse.json({
      status: "ready",
      videoUrl: resolveDisplayMediaUrl(videoUrl),
      motionType: job.motionType,
      audioEmbeddedInVideo,
      voiceAudioUrl:
        audioEmbeddedInVideo || spoken
          ? undefined
          : job.voiceAudioUrl
            ? resolveDisplayMediaUrl(job.voiceAudioUrl)
            : undefined,
      renderId: job.renderId,
    });
  }

  if (prediction.status === "failed") {
    const meta = job.metadata ?? {};
    const plate =
      typeof meta.plateVideoUrl === "string" ? meta.plateVideoUrl : undefined;
    if (spoken && job.voiceAudioUrl && plate && meta.lipsyncStage === "running") {
      try {
        const muxedUrl = await muxSpokenVoice(
          authResult,
          job.influencerId,
          job.renderId,
          plate,
          job.voiceAudioUrl,
        );
        const render = await finalizeInfluencerRender({
          userId: authResult,
          influencerId: job.influencerId,
          renderId: job.renderId,
          status: "ready",
          url: muxedUrl,
          voiceUrl: job.voiceAudioUrl,
          activate: true,
        });
        await updateInfluencerMotionJob(job.renderId, {
          status: "ready",
          videoUrl: render?.url ?? muxedUrl,
          metadata: { ...meta, lipsyncStage: "done", lipsyncError: prediction.error },
        });
        return NextResponse.json({
          status: "ready",
          videoUrl: resolveDisplayMediaUrl(render?.url ?? muxedUrl),
          motionType: job.motionType,
          audioEmbeddedInVideo: true,
          renderId: job.renderId,
        });
      } catch {
        /* fall through to failed */
      }
    }

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
    voiceAudioUrl: job.voiceAudioUrl
      ? resolveDisplayMediaUrl(job.voiceAudioUrl)
      : undefined,
  });
}
