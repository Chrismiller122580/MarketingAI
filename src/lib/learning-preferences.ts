import { prisma } from "./db";
import type { AiProvider, AiVariant, PromptPreferences } from "./types";

export function formatPromptPreferences(prefs?: PromptPreferences | null): string {
  if (!prefs) return "";
  const hints: string[] = [];
  if (prefs.preferredProvider) {
    const label = prefs.preferredProvider === "openai" ? "GPT" : "Grok";
    hints.push(`This user often prefers ${label}-style copy`);
  }
  if (prefs.styleHints?.length) {
    hints.push(...prefs.styleHints.slice(0, 3));
  }
  if (prefs.avgCaptionLength && prefs.avgCaptionLength < 200) {
    hints.push("Keep captions concise — user tends toward shorter posts");
  } else if (prefs.avgCaptionLength && prefs.avgCaptionLength > 400) {
    hints.push("User prefers longer, detailed captions");
  }
  return hints.length ? `User preferences: ${hints.join(". ")}.` : "";
}

export async function recordVariantPick(
  userId: string,
  provider: AiProvider,
  text: string,
  variants?: AiVariant[],
): Promise<void> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const existing = (settings?.promptPreferences ?? {}) as PromptPreferences;

  const providerCounts = { ...existing.providerCounts };
  providerCounts[provider] = (providerCounts[provider] ?? 0) + 1;

  const totalPicks = Object.values(providerCounts).reduce((a, b) => a + b, 0);
  const preferredProvider =
    (Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as AiProvider) ??
    provider;

  const styleHints = [...(existing.styleHints ?? [])];
  if (variants && variants.length >= 2) {
    const picked = variants.find((v) => v.provider === provider);
    const other = variants.find((v) => v.provider !== provider);
    if (picked && other) {
      if (picked.text.length < other.text.length * 0.7) {
        if (!styleHints.includes("Prefers shorter, punchier copy")) {
          styleHints.push("Prefers shorter, punchier copy");
        }
      } else if (picked.text.length > other.text.length * 1.3) {
        if (!styleHints.includes("Prefers detailed, expansive copy")) {
          styleHints.push("Prefers detailed, expansive copy");
        }
      }
    }
  }

  const lengths = existing.avgCaptionLength
    ? [existing.avgCaptionLength, text.length]
    : [text.length];
  const avgCaptionLength = Math.round(
    lengths.reduce((a, b) => a + b, 0) / lengths.length,
  );

  const promptPreferences: PromptPreferences = {
    preferredProvider,
    providerCounts,
    styleHints: styleHints.slice(-5),
    avgCaptionLength,
  };

  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      brandVoice:
        "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
      targetAudience: "Business professionals and decision-makers",
      defaultPlatforms: ["instagram", "linkedin", "twitter"],
      includeHashtags: true,
      emojiStyle: "light",
      preferAiImages: false,
      promptPreferences,
    },
    update: { promptPreferences },
  });
}

export async function getPromptPreferences(
  userId: string,
): Promise<PromptPreferences | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { promptPreferences: true },
  });
  return (settings?.promptPreferences as PromptPreferences) ?? null;
}