import { NextResponse } from "next/server";
import { z } from "zod";
import { chatCompletion } from "@/lib/ai-client";
import { isAuthError, requireAvatarWorldAdmin } from "@/lib/auth-helpers";
import {
  avatarLanguageLabel,
  dominantLanguage,
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
  mode: z.enum(["translate", "regenerate"]).optional(),
  context: z.string().max(800).optional(),
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

  const label = avatarLanguageLabel(language);
  const draft = parsed.data.script.trim();
  const mixed =
    dominantLanguage(draft) !== language &&
    /\b(the|and|for|with|keep|coming|part|how|after|still)\b/i.test(draft) &&
    dominantLanguage(draft) !== "en";
  if (language === "en" && parsed.data.mode !== "regenerate" && !mixed) {
    return NextResponse.json({ script: draft, language });
  }

  const raw = await chatCompletion(
    parsed.data.mode === "regenerate"
      ? `Write one spoken video line entirely in ${label}.
Every word must be ${label}, except personal names, place names, and brand names.
Do not mix languages. Do not add facts, prices, or claims that are not in the facts.
16 to 24 words. Return only the line.`
      : `You rewrite a short spoken line into ${label}.
Keep personal names, place names, and product names unchanged.
Do not mix languages. Do not add facts, prices, or claims that were not in the original.
Stay within 24 words. Return only the rewritten line.`,
    parsed.data.mode === "regenerate"
      ? `Facts:\n${parsed.data.context?.trim() || draft}\n\nReplace this draft:\n${draft}`
      : draft,
    { maxTokens: 160, temperature: parsed.data.mode === "regenerate" ? 0.5 : 0.3 },
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
