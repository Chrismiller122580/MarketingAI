import { uploadVoiceover } from "@/lib/ai-voice";
import { resolveDisplayMediaUrl } from "@/lib/display-media-url";
import { createInfluencerMotionJob } from "@/lib/influencer-motion-jobs";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasReplicate } from "@/lib/replicate-client";
import type { InfluencerGenerateContext } from "@/lib/types";
import type { InfluencerMotionType } from "./influencer-assets";
import { hasElevenLabs, synthesizeSpeech } from "./elevenlabs";
import { generateInfluencerScript } from "./influencer-script";
import { prepareMotionPortrait } from "./influencer-renders";
import { startInfluencerMotion } from "./influencer-motion";
import { resolveMotionVoiceId } from "./motion-voice";
import {
  motionScriptScene,
  normalizeMotionTypeSelection,
} from "./motion-actions";
import { analyzeTalkScript } from "./talk-settings";

export type ContentStudioMotionClipResult = {
  motionType: InfluencerMotionType;
  motionJobId: string;
  voiceAudioUrl?: string;
  script?: string;
};

export function canGenerateMotionType(motionType: InfluencerMotionType): boolean {
  if (!hasReplicate()) return false;
  if (motionType === "talk") return hasElevenLabs();
  return true;
}

export function canGenerateFreshMotion(
  motionTypes: InfluencerMotionType[] | undefined,
): boolean {
  const normalized = normalizeMotionTypeSelection(motionTypes);
  return normalized.length > 0 && normalized.every(canGenerateMotionType);
}

async function resolveTalkScript(input: {
  influencer: InfluencerGenerateContext;
  draftText: string;
  siteDomain: string;
  motionType: InfluencerMotionType;
  talkIndex: number;
}): Promise<{ script: string } | { error: string }> {
  const scene = motionScriptScene(input.motionType, input.talkIndex);
  if (!scene) {
    return { error: `No spoken script for ${input.motionType} motion.` };
  }

  try {
    const scriptResult = await generateInfluencerScript({
      persona: input.influencer.persona,
      facts: input.influencer.facts,
      scene,
      siteDomain: input.siteDomain,
      draftText: input.draftText,
      personalization: input.influencer.personalization,
    });
    return { script: scriptResult.script };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Script generation failed";
    return { error: message };
  }
}

export async function startContentStudioMotionClip(input: {
  userId: string;
  influencer: InfluencerGenerateContext;
  motionType: InfluencerMotionType;
  draftText: string;
  siteDomain: string;
  talkIndex?: number;
  portrait?: Awaited<ReturnType<typeof prepareMotionPortrait>>;
}): Promise<ContentStudioMotionClipResult | { error: string }> {
  if (!canGenerateMotionType(input.motionType)) {
    return {
      error:
        input.motionType === "talk"
          ? "Talk motion requires REPLICATE_API_TOKEN and ELEVENLABS_API_KEY."
          : "Motion clips require REPLICATE_API_TOKEN.",
    };
  }

  const motionRl = checkRateLimit(input.userId, "motion");
  if (!motionRl.allowed) {
    return {
      error: `Motion rate limit exceeded. Retry in ~${motionRl.retryAfterSeconds}s.`,
    };
  }

  if (!input.influencer.assets.portraitUrl) {
    return { error: "Generate and save an influencer portrait first." };
  }

  let portrait = input.portrait;
  if (!portrait) {
    try {
      portrait = await prepareMotionPortrait(
        input.userId,
        input.influencer.id,
        input.influencer.assets.portraitUrl,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Portrait preparation failed";
      return { error: `Could not prepare portrait for motion: ${message}` };
    }
  }

  const talkIndex = input.talkIndex ?? 0;
  let script: string | undefined;

  if (input.motionType === "talk") {
    const scriptResult = await resolveTalkScript({
      influencer: input.influencer,
      draftText: input.draftText,
      siteDomain: input.siteDomain,
      motionType: input.motionType,
      talkIndex,
    });
    if ("error" in scriptResult) return scriptResult;
    const analysis = analyzeTalkScript(scriptResult.script);
    if (!analysis.canRender) {
      return {
        error:
          analysis.messages[0] ??
          "Talk script is too long for lip-sync in Content Studio",
      };
    }
    script = analysis.script;
  } else {
    const scene = motionScriptScene(input.motionType, talkIndex);
    if (scene && hasElevenLabs()) {
      const scriptResult = await resolveTalkScript({
        influencer: input.influencer,
        draftText: input.draftText,
        siteDomain: input.siteDomain,
        motionType: input.motionType,
        talkIndex,
      });
      if ("script" in scriptResult) {
        script = scriptResult.script;
      }
    }
  }

  const started = await startInfluencerMotion(
    input.motionType,
    portrait,
    input.influencer.persona,
    input.motionType === "talk" ? script : undefined,
    input.motionType === "talk"
      ? resolveMotionVoiceId(input.influencer.assets.voiceId)
      : undefined,
  );

  if ("error" in started) {
    return { error: started.error };
  }

  let companionVoiceUrl = started.voiceAudioUrl;
  if (
    script &&
    input.motionType !== "talk" &&
    hasElevenLabs() &&
    !companionVoiceUrl
  ) {
    try {
        const speech = await synthesizeSpeech(script, {
          voiceId: resolveMotionVoiceId(input.influencer.assets.voiceId),
          purpose: "talk",
        });
      const voiceBytes = Buffer.from(
        speech.audioDataUrl.replace(/^data:[^;]+;base64,/, ""),
        "base64",
      );
      const uploaded = await uploadVoiceover(voiceBytes);
      if (uploaded) companionVoiceUrl = uploaded;
    } catch {
      /* motion still renders without companion voice */
    }
  }

  const job = await createInfluencerMotionJob({
    userId: input.userId,
    influencerId: input.influencer.id,
    predictionId: started.predictionId,
    motionType: input.motionType,
    voiceAudioUrl: companionVoiceUrl,
    voiceId: started.voiceId,
    script,
  });

  return {
    motionType: input.motionType,
    motionJobId: job.jobId,
    ...(companionVoiceUrl
      ? { voiceAudioUrl: resolveDisplayMediaUrl(companionVoiceUrl) }
      : {}),
    ...(script ? { script } : {}),
  };
}

export async function startContentStudioMotionClips(input: {
  userId: string;
  influencer: InfluencerGenerateContext;
  motionTypes: InfluencerMotionType[];
  draftText: string;
  siteDomain: string;
}): Promise<
  | { clips: ContentStudioMotionClipResult[] }
  | { error: string; clips?: ContentStudioMotionClipResult[] }
> {
  const motionTypes = normalizeMotionTypeSelection(input.motionTypes);
  if (!canGenerateFreshMotion(motionTypes)) {
    return {
      error: "Selected motion types are not available. Check Integrations.",
    };
  }

  if (!input.influencer.assets.portraitUrl) {
    return { error: "Generate and save an influencer portrait first." };
  }

  let portrait: Awaited<ReturnType<typeof prepareMotionPortrait>>;
  try {
    portrait = await prepareMotionPortrait(
      input.userId,
      input.influencer.id,
      input.influencer.assets.portraitUrl,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Portrait preparation failed";
    return { error: `Could not prepare portrait for motion: ${message}` };
  }

  const clips: ContentStudioMotionClipResult[] = [];
  let talkCount = 0;

  for (const motionType of motionTypes) {
    const talkIndex = motionType === "talk" ? talkCount++ : 0;
    const result = await startContentStudioMotionClip({
      ...input,
      motionType,
      talkIndex,
      portrait,
    });

    if ("error" in result) {
      if (clips.length === 0) return { error: result.error };
      return {
        error: `${motionType} clip failed: ${result.error}`,
        clips,
      };
    }

    clips.push(result);
  }

  return { clips };
}

/** @deprecated Use startContentStudioMotionClips */
export async function startContentStudioTalkMotion(input: {
  userId: string;
  influencer: InfluencerGenerateContext;
  draftText: string;
  siteDomain: string;
}) {
  const result = await startContentStudioMotionClips({
    ...input,
    motionTypes: ["talk"],
  });
  if ("error" in result && !result.clips?.length) {
    return { error: result.error };
  }
  const clip = "clips" in result ? result.clips?.[0] : undefined;
  if (!clip?.voiceAudioUrl || !clip.script) {
    const message =
      "error" in result
        ? result.error
        : "Talk clip did not return voice audio.";
    return { error: message };
  }
  return {
    motionJobId: clip.motionJobId,
    voiceAudioUrl: clip.voiceAudioUrl,
    script: clip.script,
  };
}

export function canGenerateTalkMotion(): boolean {
  return canGenerateMotionType("talk");
}