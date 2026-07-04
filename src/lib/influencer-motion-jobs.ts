import type { InfluencerMotionType } from "@/lib/viraforge/influencer-assets";

export type InfluencerMotionJob = {
  jobId: string;
  userId: string;
  influencerId: string;
  predictionId: string;
  motionType: InfluencerMotionType;
  status: "processing" | "ready" | "failed";
  videoUrl?: string;
  voiceAudioUrl?: string;
  script?: string;
  error?: string;
  createdAt: number;
};

const jobs = new Map<string, InfluencerMotionJob>();
const JOB_TTL_MS = 2 * 60 * 60 * 1000;

function pruneExpired() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

export function createInfluencerMotionJob(
  record: Omit<InfluencerMotionJob, "jobId" | "createdAt" | "status"> & {
    status?: InfluencerMotionJob["status"];
  },
): InfluencerMotionJob {
  pruneExpired();
  const jobId = `imj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const job: InfluencerMotionJob = {
    ...record,
    jobId,
    status: record.status ?? "processing",
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);
  return job;
}

export function getInfluencerMotionJob(
  jobId: string,
  userId: string,
): InfluencerMotionJob | null {
  const job = jobs.get(jobId);
  if (!job || job.userId !== userId) return null;
  return job;
}

export function updateInfluencerMotionJob(
  jobId: string,
  patch: Partial<
    Pick<
      InfluencerMotionJob,
      "status" | "videoUrl" | "voiceAudioUrl" | "error"
    >
  >,
): InfluencerMotionJob | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  Object.assign(job, patch);
  return job;
}