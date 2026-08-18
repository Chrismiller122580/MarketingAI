import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { parseCreatorAvatar } from "@/lib/schemas/creator-avatar-schema";
import {
  defaultProductFactsValues,
  productFactsSchema,
} from "@/lib/schemas/product-facts-schema";
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
    const facts = productFactsSchema.safeParse(body.productFacts ?? {});
    const factsData = facts.success ? facts.data : defaultProductFactsValues;

    if (!persona.success) {
      return NextResponse.json(
        {
          error: "Invalid persona",
          persona: persona.error.flatten(),
        },
        { status: 400 },
      );
    }

    const quoteCheck = validateQuoteAgainstFacts(
      persona.data.sampleQuote,
      factsData,
    );

    const assets = body.assets as Partial<InfluencerAssets> | undefined;

    const { influencerId, productFactsId } = await upsertInfluencerWithFacts(
      authResult,
      persona.data,
      factsData,
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