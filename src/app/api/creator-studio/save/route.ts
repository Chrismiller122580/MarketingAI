import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { parseCreatorAvatar } from "@/lib/schemas/creator-avatar-schema";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";
import { validateQuoteAgainstFacts } from "@/lib/viraforge/claim-validator";
import type { InfluencerAssets } from "@/lib/viraforge/influencer-assets";
import {
  recordCreatorEvent,
  upsertInfluencerWithFacts,
} from "@/lib/viraforge/learning";
import { repairPortraitUrlIfNeeded } from "@/lib/viraforge/influencer-renders";

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const persona = parseCreatorAvatar(body.persona);
    const facts = productFactsSchema.safeParse(body.productFacts);

    if (!persona.success || !facts.success) {
      return NextResponse.json(
        {
          error: "Invalid persona or product facts",
          persona: persona.success ? undefined : persona.error.flatten(),
          facts: facts.success ? undefined : facts.error.flatten(),
        },
        { status: 400 },
      );
    }

    const quoteCheck = validateQuoteAgainstFacts(
      persona.data.sampleQuote,
      facts.data,
    );

    const assets = body.assets as Partial<InfluencerAssets> | undefined;

    const { influencerId, productFactsId } = await upsertInfluencerWithFacts(
      authResult,
      persona.data,
      facts.data,
      assets,
    );

    if (assets?.portraitUrl) {
      await repairPortraitUrlIfNeeded(
        authResult,
        influencerId,
        assets.portraitUrl,
      );
    }

    await recordCreatorEvent(
      authResult,
      "save",
      { handle: persona.data.handle, quoteValid: quoteCheck.valid },
      influencerId,
    );

    return NextResponse.json({
      influencerId,
      productFactsId,
      quoteValidation: quoteCheck,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}