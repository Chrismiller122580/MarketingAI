import { NextResponse } from "next/server";
import { z } from "zod";
import {
  synthesizeSpeechWithMeta,
  uploadVoiceover,
} from "@/lib/ai-voice";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasElevenLabs } from "@/lib/viraforge/elevenlabs";
import {
  createInfluencerRender,
  finalizeInfluencerRender,
} from "@/lib/viraforge/influencer-renders";
import { validateQuoteAgainstFacts } from "@/lib/viraforge/claim-validator";
import { factsFromRecord } from "@/lib/schemas/product-facts-schema";
import {
  analyzeTalkScript,
  hashTalkScript,
} from "@/lib/viraforge/talk-settings";
import { getAudioDurationSec } from "@/lib/viraforge/talk-video-mux";

const voiceSchema = z.object({
  influencerId: z.string().min(1),
  script: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  if (!hasElevenLabs()) {
    return NextResponse.json(
      {
        error:
          "Voice preview requires ELEVENLABS_API_KEY. Add it in environment settings.",
      },
      { status: 503 },
    );
  }

  const rl = checkRateLimit(authResult, "voice");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Voice preview limit exceeded. Retry in ~${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = voiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { influencerId, script } = parsed.data;

    const influencer = await prisma.influencer.findFirst({
      where: { id: influencerId, userId: authResult },
      include: { productFacts: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: "Save the influencer first" },
        { status: 400 },
      );
    }

    const facts = factsFromRecord(influencer.productFacts);
    const quoteCheck = validateQuoteAgainstFacts(script, facts);
    if (!quoteCheck.valid) {
      return NextResponse.json(
        {
          error: "Script contains unverified claims",
          quoteValidation: quoteCheck,
        },
        { status: 422 },
      );
    }

    const analysis = analyzeTalkScript(script);
    if (!analysis.canRender) {
      return NextResponse.json(
        {
          error: analysis.messages[0] ?? "Script is too long for talk preview",
          analysis,
        },
        { status: 422 },
      );
    }

    const assets = (influencer.assets ?? {}) as { voiceId?: string };
    const voiceId = assets.voiceId;
    const speech = await synthesizeSpeechWithMeta(script.trim(), {
      voiceId,
      purpose: "talk",
    });
    if (!speech) {
      return NextResponse.json(
        {
          error:
            "ElevenLabs synthesis failed. Check ELEVENLABS_API_KEY and voice ID.",
        },
        { status: 502 },
      );
    }

    const audioUrl = await uploadVoiceover(speech.buffer);
    if (!audioUrl) {
      return NextResponse.json(
        {
          error:
            "Voice generated but could not be stored. Set BLOB_READ_WRITE_TOKEN in Vercel.",
        },
        { status: 503 },
      );
    }

    const { id: renderId } = await createInfluencerRender({
      userId: authResult,
      influencerId,
      type: "voice",
      status: "processing",
      script: script.trim(),
      voiceId: voiceId,
      provider: "elevenlabs",
    });

    const render = await finalizeInfluencerRender({
      userId: authResult,
      influencerId,
      renderId,
      status: "ready",
      url: audioUrl,
      activate: false,
    });

    return NextResponse.json({
      audioUrl: render?.url ?? audioUrl,
      voiceId: speech.voiceId,
      script: analysis.script,
      scriptHash: hashTalkScript(analysis.script),
      durationSec: await getAudioDurationSec(speech.buffer).catch(
        () => speech.durationSec,
      ),
      wordCount: analysis.wordCount,
      estimatedDurationSec: analysis.estimatedDurationSec,
      renderId,
      approved: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Voice preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}