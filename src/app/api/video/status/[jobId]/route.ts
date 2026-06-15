import { NextResponse } from "next/server";
import { getVideoPredictionStatus } from "@/lib/ai-video";
import { getVideoJob, updateVideoJob } from "@/lib/video-jobs";
import { requirePaidUserId, isAuthError } from "@/lib/auth-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const userId = await requirePaidUserId();
  if (isAuthError(userId)) return userId;

  try {
    const { jobId } = await params;
    const job = getVideoJob(jobId, userId as string);

    if (!job) {
      return NextResponse.json({ error: "Video job not found" }, { status: 404 });
    }

    if (job.status === "ready" && job.videoUrl) {
      return NextResponse.json({
        jobId: job.jobId,
        status: "ready",
        videoUrl: job.videoUrl,
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
      updateVideoJob(jobId, {
        status: "ready",
        videoUrl: prediction.videoUrl,
      });
      return NextResponse.json({
        jobId: job.jobId,
        status: "ready",
        videoUrl: prediction.videoUrl,
        prompt: job.prompt,
        aspectRatio: job.aspectRatio,
      });
    }

    if (prediction.status === "failed") {
      updateVideoJob(jobId, {
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