import type { Prisma } from "@prisma/client";
import { resolveDisplayMediaUrl } from "@/lib/display-media-url";
import { prisma } from "@/lib/db";
import { isBlobUrl } from "@/lib/blob-storage";
import { isBlobServeUrl } from "@/lib/display-media-url";
import type { DetectedImageFormat } from "@/lib/image-bytes";
import {
  ensurePublicMediaUrl,
  isNonPublicMediaUrl,
  loadValidatedImageBytes,
  persistDisplayableMedia,
  uploadBytesToBlob,
} from "@/lib/media-url";
import {
  mergeInfluencerAssets,
  type InfluencerAssets,
  type InfluencerMotionType,
} from "./influencer-assets";
import { patchInfluencerAssets } from "./influencer-db";

export type InfluencerRenderType =
  | "portrait"
  | "motion"
  | "voice"
  | "script"
  | "site_content";

export type InfluencerRenderStatus = "processing" | "ready" | "failed";

export type InfluencerRenderRecord = {
  id: string;
  type: InfluencerRenderType;
  status: InfluencerRenderStatus;
  url: string | null;
  voiceUrl: string | null;
  motionType: string | null;
  script: string | null;
  voiceId: string | null;
  provider: string | null;
  isActive: boolean;
  error: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

function mediaLabel(type: InfluencerRenderType, motionType?: string): string {
  if (type === "motion" && motionType) return `motion-${motionType}`;
  return type;
}

export async function persistRenderMedia(
  userId: string,
  influencerId: string,
  renderId: string,
  urlOrData: string,
  type: InfluencerRenderType,
  motionType?: string,
): Promise<string> {
  const label = mediaLabel(type, motionType);
  const ext =
    type === "motion" ? "mp4" : type === "voice" ? "mp3" : "png";
  const filename = `influencers/${userId}/${influencerId}/${renderId}-${label}.${ext}`;

  if (type === "portrait" || isNonPublicMediaUrl(urlOrData)) {
    return persistDisplayableMedia(urlOrData, filename);
  }

  try {
    return await persistDisplayableMedia(urlOrData, filename);
  } catch {
    return ensurePublicMediaUrl(urlOrData, label);
  }
}

export async function repairPortraitUrlIfNeeded(
  userId: string,
  influencerId: string,
  portraitUrl?: string,
): Promise<string | undefined> {
  if (!portraitUrl || !isNonPublicMediaUrl(portraitUrl)) return portraitUrl;

  try {
    const durableUrl = await persistDisplayableMedia(
      portraitUrl,
      `influencers/${userId}/${influencerId}/portrait-repair-${Date.now()}.png`,
    );
    await patchInfluencerAssets(userId, influencerId, {
      portraitUrl: durableUrl,
    });
    return durableUrl;
  } catch {
    return portraitUrl;
  }
}

async function listPortraitCandidateUrls(
  userId: string,
  influencerId: string,
  portraitUrl: string,
): Promise<string[]> {
  const seen = new Set<string>();
  const urls: string[] = [];

  const add = (url?: string | null) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  add(portraitUrl);

  const renders = await prisma.influencerRender.findMany({
    where: {
      userId,
      influencerId,
      type: "portrait",
      status: "ready",
      url: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { url: true, isActive: true },
  });

  for (const render of renders.filter((row) => row.isActive)) {
    add(render.url);
  }
  for (const render of renders) {
    add(render.url);
  }

  return urls;
}

export type PreparedMotionPortrait = {
  portraitUrl: string;
  bytes: Buffer;
  format: DetectedImageFormat;
};

/** Validates portrait bytes; only re-persists when the source URL is fragile. */
export async function prepareMotionPortrait(
  userId: string,
  influencerId: string,
  portraitUrl: string,
): Promise<PreparedMotionPortrait> {
  const repaired =
    (await repairPortraitUrlIfNeeded(userId, influencerId, portraitUrl)) ??
    portraitUrl;

  const candidates = await listPortraitCandidateUrls(
    userId,
    influencerId,
    repaired,
  );

  let lastError: Error | undefined;

  for (const candidate of candidates) {
    try {
      const { bytes, format } = await loadValidatedImageBytes(
        candidate,
        "Portrait",
      );

      if (isBlobServeUrl(candidate) || isBlobUrl(candidate)) {
        return { portraitUrl: candidate, bytes, format };
      }

      const durableUrl = await uploadBytesToBlob(
        bytes,
        `influencers/${userId}/${influencerId}/portrait-motion-${Date.now()}.${format.ext}`,
        format.mime,
      );
      await patchInfluencerAssets(userId, influencerId, {
        portraitUrl: durableUrl,
      });
      return { portraitUrl: durableUrl, bytes, format };
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Portrait load failed");
    }
  }

  throw (
    lastError ??
    new Error("Portrait image is missing or corrupt. Regenerate the portrait.")
  );
}

/** @deprecated Use prepareMotionPortrait — kept for callers that only need the URL. */
export async function ensureMotionPortraitUrl(
  userId: string,
  influencerId: string,
  portraitUrl: string,
): Promise<string> {
  const prepared = await prepareMotionPortrait(
    userId,
    influencerId,
    portraitUrl,
  );
  return prepared.portraitUrl;
}

export async function createInfluencerRender(input: {
  userId: string;
  influencerId: string;
  type: InfluencerRenderType;
  status?: InfluencerRenderStatus;
  url?: string;
  voiceUrl?: string;
  motionType?: InfluencerMotionType | string;
  script?: string;
  voiceId?: string;
  provider?: string;
  predictionId?: string;
  prompt?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  activate?: boolean;
}): Promise<{ id: string }> {
  const status = input.status ?? "processing";

  if (input.activate && status === "ready") {
    await prisma.influencerRender.updateMany({
      where: {
        influencerId: input.influencerId,
        userId: input.userId,
        type: input.type,
        isActive: true,
      },
      data: { isActive: false },
    });
  }

  const render = await prisma.influencerRender.create({
    data: {
      userId: input.userId,
      influencerId: input.influencerId,
      type: input.type,
      status,
      url: input.url,
      voiceUrl: input.voiceUrl,
      motionType: input.motionType,
      script: input.script,
      voiceId: input.voiceId,
      provider: input.provider,
      predictionId: input.predictionId,
      prompt: input.prompt,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      error: input.error,
      isActive: input.activate ?? false,
    },
  });

  return { id: render.id };
}

export async function finalizeInfluencerRender(input: {
  userId: string;
  influencerId: string;
  renderId: string;
  status: "ready" | "failed";
  url?: string;
  voiceUrl?: string;
  error?: string;
  activate?: boolean;
}): Promise<InfluencerRenderRecord | null> {
  const existing = await prisma.influencerRender.findFirst({
    where: {
      id: input.renderId,
      userId: input.userId,
      influencerId: input.influencerId,
    },
  });
  if (!existing) return null;

  let durableUrl = input.url;
  let durableVoiceUrl = input.voiceUrl;

  if (input.status === "ready") {
    if (durableUrl) {
      durableUrl = await persistRenderMedia(
        input.userId,
        input.influencerId,
        input.renderId,
        durableUrl,
        existing.type as InfluencerRenderType,
        existing.motionType ?? undefined,
      );
    }
    if (durableVoiceUrl) {
      durableVoiceUrl = await persistRenderMedia(
        input.userId,
        input.influencerId,
        `${input.renderId}-voice`,
        durableVoiceUrl,
        "voice",
      );
    }
  }

  if (input.activate && input.status === "ready") {
    await prisma.influencerRender.updateMany({
      where: {
        influencerId: input.influencerId,
        userId: input.userId,
        type: existing.type,
        isActive: true,
        NOT: { id: input.renderId },
      },
      data: { isActive: false },
    });
  }

  const updated = await prisma.influencerRender.update({
    where: { id: input.renderId },
    data: {
      status: input.status,
      url: durableUrl ?? existing.url,
      voiceUrl: durableVoiceUrl ?? existing.voiceUrl,
      error: input.error,
      isActive: input.activate ?? existing.isActive,
    },
  });

  if (input.activate && input.status === "ready") {
    await applyRenderToAssets(input.userId, input.influencerId, updated);
  }

  return toRenderRecord(updated);
}

async function applyRenderToAssets(
  userId: string,
  influencerId: string,
  render: {
    type: string;
    url: string | null;
    voiceUrl: string | null;
    motionType: string | null;
    script: string | null;
    voiceId: string | null;
  },
): Promise<InfluencerAssets | null> {
  const patch: Partial<InfluencerAssets> = {};

  if (render.type === "portrait" && render.url) {
    patch.portraitUrl = render.url;
  }

  if (render.type === "motion" && render.url) {
    patch.videoUrl = render.url;
    patch.motionStatus = "ready";
    patch.motionError = undefined;
    if (render.motionType) {
      patch.motionType = render.motionType as InfluencerMotionType;
    }
    if (render.voiceUrl) patch.voiceAudioUrl = render.voiceUrl;
    if (render.script) patch.lastScript = render.script;
    if (render.voiceId) patch.voiceId = render.voiceId;
  }

  if (render.type === "voice" && render.url) {
    patch.voiceAudioUrl = render.url;
    if (render.voiceId) patch.voiceId = render.voiceId;
    if (render.script) patch.lastScript = render.script;
  }

  if (Object.keys(patch).length === 0) return null;
  return patchInfluencerAssets(userId, influencerId, patch);
}

export async function activateInfluencerRender(
  userId: string,
  renderId: string,
): Promise<InfluencerAssets | null> {
  const render = await prisma.influencerRender.findFirst({
    where: { id: renderId, userId, status: "ready" },
  });
  if (!render) return null;

  await prisma.influencerRender.updateMany({
    where: {
      influencerId: render.influencerId,
      userId,
      type: render.type,
      isActive: true,
      NOT: { id: renderId },
    },
    data: { isActive: false },
  });

  await prisma.influencerRender.update({
    where: { id: renderId },
    data: { isActive: true },
  });

  return applyRenderToAssets(userId, render.influencerId, render);
}

function toRenderRecord(row: {
  id: string;
  type: string;
  status: string;
  url: string | null;
  voiceUrl: string | null;
  motionType: string | null;
  script: string | null;
  voiceId: string | null;
  provider: string | null;
  isActive: boolean;
  error: string | null;
  createdAt: Date;
  metadata: unknown;
}): InfluencerRenderRecord {
  return {
    id: row.id,
    type: row.type as InfluencerRenderType,
    status: row.status as InfluencerRenderStatus,
    url: row.url ? resolveDisplayMediaUrl(row.url) : null,
    voiceUrl: row.voiceUrl ? resolveDisplayMediaUrl(row.voiceUrl) : null,
    motionType: row.motionType,
    script: row.script,
    voiceId: row.voiceId,
    provider: row.provider,
    isActive: row.isActive,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  };
}

export async function listInfluencerRenders(
  userId: string,
  influencerId: string,
  options?: { type?: InfluencerRenderType; limit?: number },
): Promise<InfluencerRenderRecord[]> {
  const rows = await prisma.influencerRender.findMany({
    where: {
      userId,
      influencerId,
      ...(options?.type ? { type: options.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
  });

  return rows.map(toRenderRecord);
}

export async function savePortraitRender(input: {
  userId: string;
  influencerId: string;
  imageUrl: string;
  provider: string;
  prompt: string;
  metadata?: Record<string, unknown>;
}): Promise<{ renderId: string; durableUrl: string }> {
  const { id: renderId } = await createInfluencerRender({
    userId: input.userId,
    influencerId: input.influencerId,
    type: "portrait",
    status: "processing",
    provider: input.provider,
    prompt: input.prompt,
    metadata: input.metadata,
  });

  const durableUrl = await persistRenderMedia(
    input.userId,
    input.influencerId,
    renderId,
    input.imageUrl,
    "portrait",
  );

  await finalizeInfluencerRender({
    userId: input.userId,
    influencerId: input.influencerId,
    renderId,
    status: "ready",
    url: durableUrl,
    activate: true,
  });

  return { renderId, durableUrl };
}