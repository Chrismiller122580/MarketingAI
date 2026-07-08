import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { parseCreatorAvatar } from "@/lib/schemas/creator-avatar-schema";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";
import { buildPersonalizationContext } from "@/lib/viraforge/learning";
import { shortenInfluencerScriptForTalk } from "@/lib/viraforge/influencer-script";
import { checkRateLimit } from "@/lib/rate-limit";

const shortenSchema = z.object({
  influencerId: z.string().min(1),
  script: z.string().min(1).max(500),
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
    const parsed = shortenSchema.safeParse(body);
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

    const persona = parseCreatorAvatar(influencer.persona);
    if (!persona.success) {
      return NextResponse.json({ error: "Invalid persona data" }, { status: 500 });
    }

    const facts = productFactsSchema.parse({
      name: influencer.productFacts.name,
      price: influencer.productFacts.price,
      features: influencer.productFacts.features,
      location: influencer.productFacts.location ?? undefined,
      hours: influencer.productFacts.hours ?? undefined,
      ingredients: influencer.productFacts.ingredients,
    });

    const personalization = await buildPersonalizationContext(
      authResult,
      influencerId,
    );

    const result = await shortenInfluencerScriptForTalk({
      persona: persona.data,
      facts,
      script,
      personalization: personalization || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Script shorten failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}