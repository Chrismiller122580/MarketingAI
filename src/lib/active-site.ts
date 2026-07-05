import { prisma } from "@/lib/db";

const SETTINGS_DEFAULTS = {
  brandVoice:
    "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
  targetAudience: "Business professionals and decision-makers",
  defaultPlatforms: ["instagram", "linkedin", "twitter"],
  includeHashtags: true,
  emojiStyle: "light",
  preferAiImages: false,
};

export async function setActiveSiteDomain(
  userId: string,
  domain: string | null,
): Promise<void> {
  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      ...SETTINGS_DEFAULTS,
      activeSiteDomain: domain,
      activeSiteChosen: true,
    },
    update: {
      activeSiteDomain: domain,
      activeSiteChosen: true,
    },
  });
}

export async function clearActiveSiteIfMatches(
  userId: string,
  domain: string,
): Promise<void> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { activeSiteDomain: true },
  });
  if (settings?.activeSiteDomain === domain) {
    await setActiveSiteDomain(userId, null);
  }
}