import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { settingsToData } from "@/lib/db-mappers";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import type { UserSettings } from "@/lib/types";

const DEFAULTS = {
  brandVoice:
    "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
  targetAudience: "Business professionals and decision-makers",
  defaultPlatforms: ["instagram", "linkedin", "twitter"],
  includeHashtags: true,
  emojiStyle: "light",
  preferAiImages: false,
};

export async function GET() {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId, ...DEFAULTS },
      });
    }

    return NextResponse.json({ settings: settingsToData(settings) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function sanitizePatch(patch: Partial<UserSettings>): Record<string, unknown> {
  const {
    brandVoice,
    targetAudience,
    defaultPlatforms,
    includeHashtags,
    emojiStyle,
    preferAiImages,
    promptPreferences,
    creatorPreferences,
    activeSiteDomain,
    activeSiteChosen,
  } = patch;
  return {
    ...(brandVoice !== undefined && { brandVoice }),
    ...(targetAudience !== undefined && { targetAudience }),
    ...(defaultPlatforms !== undefined && { defaultPlatforms }),
    ...(includeHashtags !== undefined && { includeHashtags }),
    ...(emojiStyle !== undefined && { emojiStyle }),
    ...(preferAiImages !== undefined && { preferAiImages }),
    ...(promptPreferences !== undefined && { promptPreferences }),
    ...(creatorPreferences !== undefined && { creatorPreferences }),
    ...(activeSiteDomain !== undefined && { activeSiteDomain }),
    ...(activeSiteChosen !== undefined && { activeSiteChosen }),
  };
}

export async function PUT(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const body = await request.json();
    const patch = sanitizePatch(body.settings as Partial<UserSettings>);

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...DEFAULTS, ...patch },
      update: patch,
    });

    return NextResponse.json({ settings: settingsToData(settings) });
  } catch (error) {
    console.error("Settings PUT error", error);
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}