import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { settingsToData } from "@/lib/db-mappers";
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
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "default", ...DEFAULTS },
      });
    }

    return NextResponse.json({ settings: settingsToData(settings) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const patch = body.settings as Partial<UserSettings>;

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      create: { id: "default", ...DEFAULTS, ...patch },
      update: {
        ...(patch.brandVoice !== undefined && {
          brandVoice: patch.brandVoice,
        }),
        ...(patch.targetAudience !== undefined && {
          targetAudience: patch.targetAudience,
        }),
        ...(patch.defaultPlatforms !== undefined && {
          defaultPlatforms: patch.defaultPlatforms,
        }),
        ...(patch.includeHashtags !== undefined && {
          includeHashtags: patch.includeHashtags,
        }),
        ...(patch.emojiStyle !== undefined && { emojiStyle: patch.emojiStyle }),
        ...(patch.preferAiImages !== undefined && {
          preferAiImages: patch.preferAiImages,
        }),
      },
    });

    return NextResponse.json({ settings: settingsToData(settings) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}