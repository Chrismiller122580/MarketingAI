import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateImageFromPrompt,
  getImageProviderAvailability,
} from "@/lib/ai-image";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { parseCreatorAvatar } from "@/lib/schemas/creator-avatar-schema";
import { productFactsSchema } from "@/lib/schemas/product-facts-schema";
import {
  buildAvatarImagePrompt,
  buildAvatarPreviewSummary,
} from "@/lib/viraforge/avatar-prompts";
import { validateQuoteAgainstFacts } from "@/lib/viraforge/claim-validator";
import {
  buildPersonalizationContext,
  recordCreatorEvent,
  upsertInfluencerWithFacts,
} from "@/lib/viraforge/learning";
import { savePortraitRender } from "@/lib/viraforge/influencer-renders";

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const parsed = parseCreatorAvatar(body.persona ?? body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid persona data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let productFacts = productFactsSchema.safeParse(body.productFacts ?? {});
    if (!productFacts.success && body.influencerId) {
      const inf = await prisma.influencer.findFirst({
        where: { id: body.influencerId, userId: authResult },
        include: { productFacts: true },
      });
      if (inf?.productFacts) {
        productFacts = productFactsSchema.safeParse({
          name: inf.productFacts.name,
          price: inf.productFacts.price,
          features: inf.productFacts.features,
          location: inf.productFacts.location ?? undefined,
          hours: inf.productFacts.hours ?? undefined,
          ingredients: inf.productFacts.ingredients,
        });
      }
    }

    const factsData = productFacts.success
      ? productFacts.data
      : {
          name: "",
          price: "",
          features: [] as string[],
        };

    const quoteValidation = validateQuoteAgainstFacts(
      parsed.data.sampleQuote,
      factsData,
    );

    if (!quoteValidation.valid) {
      return NextResponse.json(
        {
          error: "Sample quote contains unverified claims",
          quoteValidation,
        },
        { status: 422 },
      );
    }

    const influencerId = body.influencerId as string | undefined;
    const personalization = await buildPersonalizationContext(
      authResult,
      influencerId,
    );

    const siteContext = body.siteContext as
      | { domain?: string; brandName?: string; tone?: string; tagline?: string }
      | undefined;

    const prompt = buildAvatarImagePrompt(parsed.data, {
      personalization,
      productFacts: factsData,
      site: siteContext,
    });

    const result = await generateImageFromPrompt(prompt, {
      platform: "instagram",
      size: "1024x1024",
    });

    if (!result) {
      const providers = getImageProviderAvailability();
      const error = providers.any
        ? "Image API request failed. Check OPENAI_API_KEY billing/limits or server logs."
        : process.env.NODE_ENV === "development"
          ? "No AI image keys in .env.local. Set OPENAI_API_KEY or XAI_API_KEY, then restart npm run dev."
          : "AI image generation unavailable. Add OPENAI_API_KEY or XAI_API_KEY in Vercel env vars and redeploy.";
      return NextResponse.json(
        { error, providers },
        { status: 503 },
      );
    }

    const saved = await upsertInfluencerWithFacts(
      authResult,
      parsed.data,
      factsData,
    );

    const suggestionSnapshot = body.suggestionSnapshot as
      | Record<string, unknown>
      | undefined;

    const { durableUrl: imageUrl } = await savePortraitRender({
      userId: authResult,
      influencerId: saved.influencerId,
      imageUrl: result.url,
      provider: result.provider,
      prompt: result.prompt,
      metadata: suggestionSnapshot
        ? { suggestionSnapshot, siteDomain: siteContext?.domain }
        : siteContext?.domain
          ? { siteDomain: siteContext.domain }
          : undefined,
    });

    const eventType = body.influencerId ? "regenerate" : "generate";
    await recordCreatorEvent(
      authResult,
      eventType,
      { provider: result.provider },
      saved.influencerId,
    );

    return NextResponse.json({
      imageUrl,
      prompt: result.prompt,
      provider: result.provider,
      previewSummary: buildAvatarPreviewSummary(parsed.data),
      influencerId: saved.influencerId,
      quoteValidation,
      personalizationUsed: personalization.length > 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Avatar generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}