import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveDisplayMediaUrl } from "@/lib/display-media-url";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  createInfluencerMotionJob,
} from "@/lib/influencer-motion-jobs";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasElevenLabs } from "@/lib/viraforge/elevenlabs";
import {
  mergeInfluencerAssets,
  type InfluencerAssets,
  type InfluencerMotionType,
} from "@/lib/viraforge/influencer-assets";
import {
  startInfluencerMotion,
  type PreparedTalkAudio,
} from "@/lib/viraforge/influencer-motion";
import { recordCreatorEvent } from "@/lib/viraforge/learning";
import { resolveMotionVoiceId } from "@/lib/viraforge/motion-voice";
import { prepareMotionPortrait } from "@/lib/viraforge/influencer-renders";
import { validateQuoteAgainstFacts } from "@/lib/viraforge/claim-validator";
import { parseCreatorAvatar } from "@/lib/schemas/creator-avatar-schema";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";
import { prisma } from "@/lib/db";
import { hasReplicate } from "@/lib/replicate-client";
import {
  analyzeTalkScript,
  hashTalkScript,
} from "@/lib/viraforge/talk-settings";

const motionSchema = z.object({
  influencerId: z.string().min(1),
  motionType: z.enum(["talk", "walk", "spin", "jump", "wave", "point"]),
  script: z.string().max(500).optional(),
  approvedVoiceRenderId: z.string().min(1).optional(),
  approvedScriptHash: z.string().max(32).optional(),
});

async function loadApprovedTalkAudio(
  userId: string,
  influencerId: string,
  renderId: string,
  expectedScriptHash: string,
): Promise<PreparedTalkAudio | { error: string }> {
  const render = await prisma.influencerRender.findFirst({
    where: {
      id: renderId,
      userId,
      influencerId,
      type: "voice",
      status: "ready",
    },
  });

  if (!render?.url || !render.script) {
    return { error: "Approved voice preview not found. Preview voice again." };
  }

  const scriptHash = hashTalkScript(render.script);
  if (scriptHash !== expectedScriptHash) {
    return {
      error: "Script changed since voice preview. Preview voice again.",
    };
  }

  try {
    const audioUrl = resolveDisplayMediaUrl(render.url);
    const response = await fetch(audioUrl);
    if (!response.ok) {
      return { error: "Could not load approved voice preview audio." };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      audioDataUrl: `data:audio/mpeg;base64,${buffer.toString("base64")}`,
      voiceId: render.voiceId ?? "",
    };
  } catch {
    return { error: "Could not load approved voice preview audio." };
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const rl = checkRateLimit(authResult, "motion");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Motion generation rate limit exceeded. Retry in ~${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  if (!hasReplicate()) {
    return NextResponse.json(
      {
        error:
          "Motion video requires REPLICATE_API_TOKEN. Add it in Vercel env vars.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = motionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid motion request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      influencerId,
      motionType,
      script,
      approvedVoiceRenderId,
      approvedScriptHash,
    } = parsed.data;

    if (motionType === "talk" && !hasElevenLabs()) {
      return NextResponse.json(
        {
          error:
            "Talking clips require ELEVENLABS_API_KEY. Walk, spin, and jump only need Replicate.",
        },
        { status: 503 },
      );
    }

    const influencer = await prisma.influencer.findFirst({
      where: { id: influencerId, userId: authResult },
      include: { productFacts: true },
    });

    if (!influencer) {
      return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
    }

    const persona = parseCreatorAvatar(influencer.persona);
    if (!persona.success) {
      return NextResponse.json({ error: "Invalid stored persona" }, { status: 500 });
    }

    const assets = (influencer.assets ?? {}) as InfluencerAssets;
    if (!assets.portraitUrl) {
      return NextResponse.json(
        { error: "Generate a portrait first before motion clips" },
        { status: 400 },
      );
    }

    const talkScript =
      script?.trim() ||
      persona.data.sampleQuote ||
      assets.lastScript ||
      "";

    if (motionType === "talk" && !talkScript) {
      return NextResponse.json(
        {
          error:
            "Add a script in Motion & Voice (or a sample quote) before generating a talk clip.",
        },
        { status: 400 },
      );
    }

    if (motionType === "talk") {
      const analysis = analyzeTalkScript(talkScript);
      if (!analysis.canRender) {
        return NextResponse.json(
          {
            error: analysis.messages[0] ?? "Script is too long for talk lip-sync",
            analysis,
          },
          { status: 422 },
        );
      }

      if (!approvedVoiceRenderId || !approvedScriptHash) {
        return NextResponse.json(
          {
            error:
              "Preview and approve voice before rendering Talk. Run preflight first.",
          },
          { status: 422 },
        );
      }

      if (approvedScriptHash !== analysis.scriptHash) {
        return NextResponse.json(
          { error: "Script changed since preview. Preview voice again." },
          { status: 422 },
        );
      }
    }

    const motionVoiceId = resolveMotionVoiceId(assets.voiceId);

    if (motionType === "talk" && influencer.productFacts) {
      const facts = productFactsSchema.safeParse({
        name: influencer.productFacts.name,
        price: influencer.productFacts.price,
        features: influencer.productFacts.features,
        location: influencer.productFacts.location ?? undefined,
        hours: influencer.productFacts.hours ?? undefined,
        ingredients: influencer.productFacts.ingredients,
      });

      if (facts.success) {
        const quoteCheck = validateQuoteAgainstFacts(talkScript, facts.data);
        if (!quoteCheck.valid) {
          return NextResponse.json(
            {
              error: "Script contains unverified claims",
              quoteValidation: quoteCheck,
            },
            { status: 422 },
          );
        }
      }
    }

    let portrait;
    let preparedTalk: PreparedTalkAudio | undefined;
    try {
      const portraitPromise = prepareMotionPortrait(
        authResult,
        influencerId,
        assets.portraitUrl,
      );
      if (motionType === "talk") {
        const [preparedPortrait, approvedAudio] = await Promise.all([
          portraitPromise,
          loadApprovedTalkAudio(
            authResult,
            influencerId,
            approvedVoiceRenderId!,
            approvedScriptHash!,
          ),
        ]);
        portrait = preparedPortrait;
        if ("error" in approvedAudio) {
          return NextResponse.json(
            { error: approvedAudio.error },
            { status: 422 },
          );
        }
        preparedTalk = {
          audioDataUrl: approvedAudio.audioDataUrl,
          voiceId: approvedAudio.voiceId || motionVoiceId || "",
        };
      } else {
        portrait = await portraitPromise;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Portrait could not be loaded for motion";
      return NextResponse.json(
        {
          error: `Portrait is missing or invalid. Regenerate the portrait and try again. (${message})`,
        },
        { status: 422 },
      );
    }

    const started = await startInfluencerMotion(
      motionType as InfluencerMotionType,
      portrait,
      persona.data,
      motionType === "talk" ? talkScript : undefined,
      motionType === "talk" ? motionVoiceId : undefined,
      preparedTalk,
    );

    if ("error" in started) {
      const providerError =
        /replicate|elevenlabs|portrait|voice|script/i.test(started.error);
      return NextResponse.json(
        { error: started.error },
        { status: providerError ? 502 : 500 },
      );
    }

    let job;
    try {
      job = await createInfluencerMotionJob({
        userId: authResult,
        influencerId,
        predictionId: started.predictionId,
        motionType: motionType as InfluencerMotionType,
        voiceAudioUrl: started.voiceAudioUrl,
        voiceId: started.voiceId,
        script: motionType === "talk" ? talkScript : undefined,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save motion job";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const nextAssets = mergeInfluencerAssets(assets, {
      motionType: motionType as InfluencerMotionType,
      motionJobId: job.jobId,
      motionStatus: "processing",
      motionError: undefined,
      ...(started.voiceAudioUrl
        ? {
            voiceAudioUrl: started.voiceAudioUrl,
            voiceId: started.voiceId,
            lastScript: talkScript,
          }
        : {}),
    });

    await prisma.influencer.update({
      where: { id: influencerId },
      data: { assets: nextAssets },
    });

    await recordCreatorEvent(
      authResult,
      "generate",
      { motionType, jobId: job.jobId },
      influencerId,
    );

    return NextResponse.json({
      jobId: job.jobId,
      motionType,
      status: "processing",
      voiceAudioUrl: started.voiceAudioUrl
        ? resolveDisplayMediaUrl(started.voiceAudioUrl)
        : undefined,
      providers: {
        replicate: true,
        elevenlabs: motionType === "talk" ? hasElevenLabs() : undefined,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Motion generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}