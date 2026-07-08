import { prisma } from "@/lib/db";
import type { InfluencerMotionType } from "@/lib/viraforge/influencer-assets";
import { createInfluencerRender } from "@/lib/viraforge/influencer-renders";

export type InfluencerMotionJob = {
  jobId: string;
  userId: string;
  influencerId: string;
  predictionId: string;
  motionType: InfluencerMotionType;
  renderId: string;
  status: "processing" | "ready" | "failed";
  videoUrl?: string;
  voiceAudioUrl?: string;
  script?: string;
  error?: string;
};

type MotionRenderRow = {
  id: string;
  userId: string;
  influencerId: string;
  predictionId: string | null;
  motionType: string | null;
  status: string;
  url: string | null;
  voiceUrl: string | null;
  script: string | null;
  error: string | null;
  metadata: unknown;
};

function toMotionJob(render: MotionRenderRow): InfluencerMotionJob | null {
  if (!render.predictionId || !render.motionType) return null;

  return {
    jobId: render.id,
    userId: render.userId,
    influencerId: render.influencerId,
    predictionId: render.predictionId,
    motionType: render.motionType as InfluencerMotionType,
    renderId: render.id,
    status: render.status as InfluencerMotionJob["status"],
    videoUrl: render.url ?? undefined,
    voiceAudioUrl: render.voiceUrl ?? undefined,
    script: render.script ?? undefined,
    error: render.error ?? undefined,
  };
}

async function findMotionRender(
  jobId: string,
  userId: string,
): Promise<MotionRenderRow | null> {
  const byId = await prisma.influencerRender.findFirst({
    where: { id: jobId, userId, type: "motion" },
  });
  if (byId) return byId;

  // Legacy imj_* ids from the old in-memory job store.
  if (!jobId.startsWith("imj_")) return null;

  const legacy = await prisma.influencerRender.findMany({
    where: { userId, type: "motion" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const byMetadata = legacy.find((render) => {
    const metadata = render.metadata as { jobId?: string } | null;
    return metadata?.jobId === jobId;
  });
  if (byMetadata) return byMetadata;

  const timestampMatch = jobId.match(/^imj_(\d+)_/);
  if (!timestampMatch) return null;

  const createdAtMs = Number(timestampMatch[1]);
  if (!Number.isFinite(createdAtMs)) return null;

  return (
    legacy.find((render) => {
      const delta = Math.abs(render.createdAt.getTime() - createdAtMs);
      return delta <= 30_000 && render.status === "processing";
    }) ?? null
  );
}

export async function createInfluencerMotionJob(
  record: {
    userId: string;
    influencerId: string;
    predictionId: string;
    motionType: InfluencerMotionType;
    renderId?: string;
    voiceAudioUrl?: string;
    script?: string;
    status?: InfluencerMotionJob["status"];
  },
): Promise<InfluencerMotionJob> {
  if (record.renderId) {
    const existing = await prisma.influencerRender.findFirst({
      where: {
        id: record.renderId,
        userId: record.userId,
        influencerId: record.influencerId,
        type: "motion",
      },
    });

    if (!existing) {
      throw new Error("Motion render not found");
    }

    const job = toMotionJob(existing);
    if (!job) {
      throw new Error("Motion render is missing prediction metadata");
    }
    return job;
  }

  const { id: renderId } = await createInfluencerRender({
    userId: record.userId,
    influencerId: record.influencerId,
    type: "motion",
    status: record.status ?? "processing",
    motionType: record.motionType,
    script: record.script,
    voiceUrl: record.voiceAudioUrl,
    provider: "replicate",
    predictionId: record.predictionId,
  });

  const created = await prisma.influencerRender.findFirstOrThrow({
    where: { id: renderId },
  });

  const job = toMotionJob(created);
  if (!job) {
    throw new Error("Failed to create motion job");
  }
  return job;
}

export async function getInfluencerMotionJob(
  jobId: string,
  userId: string,
): Promise<InfluencerMotionJob | null> {
  const render = await findMotionRender(jobId, userId);
  if (!render) return null;
  return toMotionJob(render);
}

export async function updateInfluencerMotionJob(
  jobId: string,
  patch: Partial<
    Pick<
      InfluencerMotionJob,
      "status" | "videoUrl" | "voiceAudioUrl" | "error"
    >
  >,
): Promise<InfluencerMotionJob | null> {
  const render = await prisma.influencerRender.findFirst({
    where: { id: jobId, type: "motion" },
  });
  if (!render) return null;

  const updated = await prisma.influencerRender.update({
    where: { id: jobId },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.videoUrl !== undefined ? { url: patch.videoUrl } : {}),
      ...(patch.voiceAudioUrl !== undefined
        ? { voiceUrl: patch.voiceAudioUrl }
        : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
    },
  });

  return toMotionJob(updated);
}