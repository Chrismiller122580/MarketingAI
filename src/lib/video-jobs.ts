import { prisma } from "@/lib/db";
import type { VideoAspectRatio } from "./ai-video";

export type VideoJobRecord = {
  jobId: string;
  userId: string;
  predictionId: string;
  prompt: string;
  aspectRatio: VideoAspectRatio;
  status: "processing" | "ready" | "failed";
  videoUrl?: string;
  error?: string;
  createdAt: number;
};

function toRecord(row: {
  id: string;
  userId: string;
  predictionId: string;
  prompt: string;
  aspectRatio: string;
  status: string;
  videoUrl: string | null;
  error: string | null;
  createdAt: Date;
}): VideoJobRecord {
  return {
    jobId: row.id,
    userId: row.userId,
    predictionId: row.predictionId,
    prompt: row.prompt,
    aspectRatio: row.aspectRatio as VideoAspectRatio,
    status: row.status as VideoJobRecord["status"],
    videoUrl: row.videoUrl ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.createdAt.getTime(),
  };
}

export async function createVideoJob(
  userId: string,
  predictionId: string,
  prompt: string,
  aspectRatio: VideoAspectRatio,
): Promise<VideoJobRecord> {
  const row = await prisma.videoJob.create({
    data: {
      userId,
      predictionId,
      prompt,
      aspectRatio,
      status: "processing",
    },
  });
  return toRecord(row);
}

export async function getVideoJob(
  jobId: string,
  userId: string,
): Promise<VideoJobRecord | null> {
  const row = await prisma.videoJob.findFirst({
    where: { id: jobId, userId },
  });
  return row ? toRecord(row) : null;
}

export async function updateVideoJob(
  jobId: string,
  update: Partial<Pick<VideoJobRecord, "status" | "videoUrl" | "error">>,
): Promise<VideoJobRecord | null> {
  try {
    const row = await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        ...(update.status ? { status: update.status } : {}),
        ...(update.videoUrl !== undefined ? { videoUrl: update.videoUrl } : {}),
        ...(update.error !== undefined ? { error: update.error } : {}),
      },
    });
    return toRecord(row);
  } catch {
    return null;
  }
}