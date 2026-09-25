import { NextResponse } from "next/server";
import { z } from "zod";
import { chatCompletion } from "@/lib/ai-client";
import { isAuthError, requireAvatarWorldAdmin } from "@/lib/auth-helpers";
import {
  avatarLanguageLabel,
  normalizeAvatarLanguage,
} from "@/lib/viraforge/avatar-language";
import {
  patchWorldProfile,
  worldFromMemory,
} from "@/lib/viraforge/avatar-world";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  script: z.string().min(1).max(500),
  language: z.string().max(12).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAvatarWorldAdmin();
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Add a line to rewrite" }, { status: 400 });
  }

  const influencer = await prisma.influencer.findFirst({
    where: { id, userId: authResult },
    select: { memory: true },
  });
  if (!influencer) {
    return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
  }

  const language = normalizeAvatarLanguage(
    parsed.data.language ?? worldFromMemory(influencer.memory).language,
  );
  if (parsed.data.language) {
    await patchWorldProfile(authResult, id, { language });
  }

  if (language === "en") {
    return NextResponse.json({
      script: parsed.data.script.trim(),
      language,
    });
  }

  const label = avatarLanguageLabel(language);
  const raw = await chatCompletion(
    `You rewrite a short spoken line into ${label}.
Keep personal names, place names, and product names unchanged.
Do not add facts, prices, or claims that were not in the original.
Stay within 24 words. Return only the rewritten line.`,
    parsed.data.script.trim(),
    { maxTokens: 160, temperature: 0.3 },
  );

  const script = raw?.trim().replace(/^["']|["']$/g, "");
  if (!script) {
    return NextResponse.json(
      { error: `Could not write the line in ${label}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    script: script.split(/\s+/).slice(0, 24).join(" "),
    language,
  });
}
