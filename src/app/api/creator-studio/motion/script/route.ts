import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { parseCreatorAvatar } from "@/lib/schemas/creator-avatar-schema";
import { factsFromRecord } from "@/lib/schemas/product-facts-schema";
import { buildPersonalizationContext } from "@/lib/viraforge/learning";
import {
  generateInfluencerScript,
  type InfluencerScriptScene,
} from "@/lib/viraforge/influencer-script";
import { checkRateLimit } from "@/lib/rate-limit";
import { createInfluencerRender } from "@/lib/viraforge/influencer-renders";

const scriptSchema = z.object({
  influencerId: z.string().min(1),
  scene: z.enum(["intro", "pitch", "quote", "cta", "greet"]),
  siteDomain: z.string().max(200).optional(),
  draftText: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const rl = checkRateLimit(authResult, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Retry in ~${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = scriptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { influencerId, scene, siteDomain, draftText } = parsed.data;

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

    const persona = parseCreatorAvatar(influencer.persona);
    if (!persona.success) {
      return NextResponse.json({ error: "Invalid persona data" }, { status: 500 });
    }

    const facts = factsFromRecord(influencer.productFacts);

    const personalization = await buildPersonalizationContext(
      authResult,
      influencerId,
    );

    const result = await generateInfluencerScript({
      persona: persona.data,
      facts,
      scene: scene as InfluencerScriptScene,
      siteDomain,
      draftText,
      personalization: personalization || undefined,
    });

    const { id: renderId } = await createInfluencerRender({
      userId: authResult,
      influencerId,
      type: "script",
      status: "ready",
      script: result.script,
      metadata: {
        scene,
        siteDomain,
        validation: result.validation,
      },
      activate: false,
    });

    return NextResponse.json({ ...result, renderId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Script generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}