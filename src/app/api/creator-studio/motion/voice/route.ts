import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasElevenLabs, synthesizeSpeech } from "@/lib/viraforge/elevenlabs";
import { validateQuoteAgainstFacts } from "@/lib/viraforge/claim-validator";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";

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

    if (!influencer?.productFacts) {
      return NextResponse.json(
        { error: "Save influencer with product facts first" },
        { status: 400 },
      );
    }

    const facts = productFactsSchema.safeParse({
      name: influencer.productFacts.name,
      price: influencer.productFacts.price,
      features: influencer.productFacts.features,
      location: influencer.productFacts.location ?? undefined,
      hours: influencer.productFacts.hours ?? undefined,
      ingredients: influencer.productFacts.ingredients,
    });

    if (facts.success) {
      const quoteCheck = validateQuoteAgainstFacts(script, facts.data);
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

    const { audioDataUrl, voiceId } = await synthesizeSpeech(script.trim());

    return NextResponse.json({
      audioDataUrl,
      voiceId,
      script: script.trim(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Voice preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}