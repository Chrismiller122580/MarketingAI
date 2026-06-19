import { chatCompletion } from "./ai-client";
import type { BrandProfile, BrandSynthesis, SitePage } from "./types";

function parseSynthesis(raw: string): BrandSynthesis | null {
  try {
    const parsed = JSON.parse(raw) as Partial<BrandSynthesis>;
    if (!parsed.voiceGuide || !Array.isArray(parsed.messagingPillars)) return null;
    return {
      voiceGuide: String(parsed.voiceGuide).slice(0, 500),
      messagingPillars: (parsed.messagingPillars ?? []).slice(0, 5).map(String),
      contentThemes: (parsed.contentThemes ?? []).slice(0, 6).map(String),
      doNotSay: (parsed.doNotSay ?? []).slice(0, 5).map(String),
      audiencePersona: String(parsed.audiencePersona ?? "").slice(0, 200),
    };
  } catch {
    return null;
  }
}

function buildPageSummary(pages: SitePage[]): string {
  return pages
    .slice(0, 5)
    .map(
      (p) =>
        `Page: ${p.title}\nPath: ${p.path}\nDescription: ${p.description}\nHeadings: ${p.headings.slice(0, 3).join("; ")}\nExcerpt: ${p.excerpt.slice(0, 200)}`,
    )
    .join("\n\n");
}

export async function synthesizeBrand(
  heuristic: BrandProfile,
  pages: SitePage[],
): Promise<BrandProfile> {
  const pageSummary = buildPageSummary(pages);
  const bm = heuristic.businessModel;

  const systemPrompt = `You are a brand strategist. Analyze the website content and produce a concise brand voice guide for marketing copywriters.
Return valid JSON only with keys: voiceGuide (string, 2-3 sentences), messagingPillars (string array, 3-5 items), contentThemes (string array, 4-6 topics to post about), doNotSay (string array, phrases to avoid), audiencePersona (string, one sentence).`;

  const userMessage = `Brand: ${heuristic.name}
Tagline: ${heuristic.tagline}
Detected tone: ${heuristic.tone}
Keywords: ${heuristic.keywords.join(", ")}
Business type: ${bm?.type ?? "unknown"}
Market: ${bm?.market ?? "unknown"}
Value prop: ${bm?.valueProposition ?? ""}
Conversion goal: ${bm?.conversionGoal ?? "engagement"}

Site pages:
${pageSummary}`;

  const raw = await chatCompletion(systemPrompt, userMessage, {
    maxTokens: 800,
    temperature: 0.5,
    jsonMode: true,
  });

  if (!raw) return heuristic;

  const synthesis = parseSynthesis(raw);
  if (!synthesis) return heuristic;

  return { ...heuristic, synthesis };
}

export function formatVoiceGuide(brand: BrandProfile): string {
  if (brand.synthesis?.voiceGuide) {
    const parts = [brand.synthesis.voiceGuide];
    if (brand.synthesis.messagingPillars.length > 0) {
      parts.push(`Pillars: ${brand.synthesis.messagingPillars.join("; ")}`);
    }
    if (brand.synthesis.doNotSay.length > 0) {
      parts.push(`Avoid: ${brand.synthesis.doNotSay.join(", ")}`);
    }
    return parts.join(". ");
  }
  return brand.tone;
}