import { NextResponse } from "next/server";
import { resolveDisplayMediaUrl } from "@/lib/display-media-url";
import { getVideoPredictionStatus } from "@/lib/ai-video";
import { getVideoJob, updateVideoJob } from "@/lib/video-jobs";
import { persistDisplayableMedia } from "@/lib/media-url";
import { requirePaidUserId, isAuthError } from "@/lib/auth-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const userId = await requirePaidUserId();
  if (isAuthError(userId)) return userId;

  try {
    const { jobId } = await params;
    const job = await getVideoJob(jobId, userId as string);

    if (!job) {
      return NextResponse.json({ error: "Video job not found" }, { status: 404 });
    }

    if (job.status === "ready" && job.videoUrl) {
      return NextResponse.json({
        jobId: job.jobId,
        status: "ready",
        videoUrl: resolveDisplayMediaUrl(job.videoUrl),
        prompt: job.prompt,
        aspectRatio: job.aspectRatio,
      });
    }

    if (job.status === "failed") {
      return NextResponse.json({
        jobId: job.jobId,
        status: "failed",
        error: job.error ?? "Video generation failed",
      });
    }

    const prediction = await getVideoPredictionStatus(job.predictionId);

    if (!prediction) {
      return NextResponse.json(
        { error: "Failed to check video status" },
        { status: 500 },
      );
    }

    if (prediction.status === "ready" && prediction.videoUrl) {
      let durableUrl = prediction.videoUrl;
      try {
        durableUrl = await persistDisplayableMedia(
          prediction.videoUrl,
          `videos/${userId}/${jobId}.mp4`,
        );
      } catch {
        /* keep ephemeral Replicate URL */
      }

      await updateVideoJob(jobId, {
        status: "ready",
        videoUrl: durableUrl,
      });

      return NextResponse.json({
        jobId: job.jobId,
        status: "ready",
        videoUrl: resolveDisplayMediaUrl(durableUrl),
        prompt: job.prompt,
        aspectRatio: job.aspectRatio,
      });
    }

    if (prediction.status === "failed") {
      await updateVideoJob(jobId, {
        status: "failed",
        error: prediction.error,
      });
      return NextResponse.json({
        jobId: job.jobId,
        status: "failed",
        error: prediction.error ?? "Video generation failed",
      });
    }

    return NextResponse.json({
      jobId: job.jobId,
      status: "processing",
      prompt: job.prompt,
      aspectRatio: job.aspectRatio,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check video status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}