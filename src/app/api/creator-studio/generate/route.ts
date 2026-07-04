import { NextResponse } from "next/server";
import { generateImageFromPrompt } from "@/lib/ai-image";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { creatorAvatarSchema } from "@/lib/schemas/creator-avatar-schema";
import {
  buildAvatarImagePrompt,
  buildAvatarPreviewSummary,
} from "@/lib/viraforge/avatar-prompts";

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
    const parsed = creatorAvatarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid persona data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const prompt = buildAvatarImagePrompt(parsed.data);
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

    return NextResponse.json({
      imageUrl,
      prompt: result.prompt,
      provider: result.provider,
      previewSummary: buildAvatarPreviewSummary(parsed.data),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Avatar generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}