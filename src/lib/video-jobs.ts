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

const jobs = new Map<string, VideoJobRecord>();
const JOB_TTL_MS = 2 * 60 * 60 * 1000;

function pruneExpired() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

export function createVideoJob(
  userId: string,
  predictionId: string,
  prompt: string,
  aspectRatio: VideoAspectRatio,
): VideoJobRecord {
  pruneExpired();
  const jobId = `vj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const record: VideoJobRecord = {
    jobId,
    userId,
    predictionId,
    prompt,
    aspectRatio,
    status: "processing",
    createdAt: Date.now(),
  };
  jobs.set(jobId, record);
  return record;
}

export function getVideoJob(
  jobId: string,
  userId: string,
): VideoJobRecord | null {
  const job = jobs.get(jobId);
  if (!job || job.userId !== userId) return null;
  return job;
}

export function updateVideoJob(
  jobId: string,
  update: Partial<Pick<VideoJobRecord, "status" | "videoUrl" | "error">>,
): VideoJobRecord | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  Object.assign(job, update);
  return job;
}