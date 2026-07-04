import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateImageFromPrompt } from "@/lib/ai-image";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { creatorAvatarSchema } from "@/lib/schemas/creator-avatar-schema";
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

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;

  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch generated image");
  }

  const buffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = imageResponse.headers.get("content-type") ?? "image/png";
  return `data:${contentType};base64,${base64}`;
}

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const parsed = creatorAvatarSchema.safeParse(body.persona ?? body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid persona data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let productFacts = productFactsSchema.safeParse(body.productFacts);
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

    if (!productFacts.success) {
      return NextResponse.json(
        { error: "Product facts required before generation" },
        { status: 400 },
      );
    }

    const quoteValidation = validateQuoteAgainstFacts(
      parsed.data.sampleQuote,
      productFacts.data,
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

    const prompt = buildAvatarImagePrompt(parsed.data, {
      personalization,
      productFacts: productFacts.data,
    });

    const result = await generateImageFromPrompt(prompt, {
      platform: "instagram",
      size: "1024x1024",
    });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "AI image generation unavailable. Add OPENAI_API_KEY or XAI_API_KEY.",
        },
        { status: 503 },
      );
    }

    const imageUrl = await toDataUrl(result.url);

    const saved = await upsertInfluencerWithFacts(
      authResult,
      parsed.data,
      productFacts.data,
      { portraitUrl: imageUrl },
    );

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