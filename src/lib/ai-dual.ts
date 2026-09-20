import { callProvider } from "./ai-client";
import { formatVoiceGuide } from "./brand-synthesis";
import { formatPromptPreferences } from "./learning-preferences";
import {
  formatBusinessContext,
  platformCopyHint,
} from "./business-context";
import { getAngleLabel } from "./content-angles";
import { buildUniquenessInstructions } from "./content-uniqueness";
import type {
  AiProvider,
  AiVariant,
  ContentType,
  GenerateRequest,
  Platform,
  SitePage,
  UserSettings,
} from "./types";

type EnhancementResult = {
  variants: AiVariant[];
  recommendation?: AiProvider;
};

const PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: "GPT-4o mini",
  xai: "Grok 3 mini",
};

const CONTENT_TYPE_INSTRUCTIONS: Record<ContentType, string> = {
  "Social Post":
    "Hook in line 1. Then 2–4 short paragraphs. One CTA. Hashtags only at the end if the platform uses them.",
  "Email Copy":
    "Line 1 must be `Subject: ...`. Then 2 short paragraphs and one CTA. No 'Hi there' or 'Hope this finds you'.",
  "Ad Headline":
    "One line, 40–80 characters. No hashtags, no URL, no sentence dump.",
  "Blog Intro":
    "80–140 words. Specific and useful. No 'In today's world'. End ready to continue into the article.",
  "Product Description":
    "Benefit-led opener, then 3 concrete features from the page. Do not invent specs or prices.",
  "Video Ad":
    "Spoken-style caption: hook, one proof point, CTA. Under 70 words. Write how it would be said out loud.",
  Reel:
    "First line is the on-screen hook (max 8 words). Then 1–2 short lines and a CTA. 3–5 hashtags at the end.",
  Story:
    "1–2 lines max plus a swipe/tap CTA. No hashtag dump.",
};

function copyCharLimit(platform: Platform, contentType: ContentType): number {
  if (contentType === "Ad Headline") return 80;
  if (contentType === "Story") return 140;
  if (contentType === "Reel") return 420;
  if (contentType === "Video Ad") return 500;
  if (contentType === "Blog Intro") return 900;
  if (contentType === "Product Description") return 800;
  if (contentType === "Email Copy") return 1400;
  if (platform === "twitter") return 240;
  if (platform === "pinterest") return 450;
  if (platform === "linkedin") return 1800;
  return 900;
}

export function cleanGeneratedCopy(text: string): string {
  let out = text.trim();
  out = out.replace(/^```(?:[\w-]+)?\s*/i, "").replace(/\s*```$/i, "");
  out = out.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  out = out.replace(
    /^(here(?:'s| is) (?:a |the )?(?:post|caption|copy|ad|email|script|headline)[:\s-]*)/i,
    "",
  );
  out = out.replace(/^\*\*|\*\*$/g, "").trim();
  return out.trim();
}

function buildSystemPrompt(
  request: GenerateRequest,
  settings: UserSettings,
  platform: Platform,
  contentType: ContentType,
): string {
  const settingsVoice = settings.brandVoice?.trim();
  const voice =
    formatVoiceGuide(request.site.brand) ||
    settingsVoice ||
    "Professional yet approachable.";
  const audience =
    request.site.brand.synthesis?.audiencePersona || settings.targetAudience;
  const businessCtx = formatBusinessContext(request.site.brand);
  const platformHint = platformCopyHint(platform);
  const typeHint = CONTENT_TYPE_INSTRUCTIONS[contentType];
  const userPrefs = formatPromptPreferences(settings.promptPreferences);
  const winning = request.winningCopy?.promptBlock?.trim();
  const angle = request.contentAngle ?? "auto";
  const uniqueness = buildUniquenessInstructions(
    request.existingPosts ?? [],
    angle,
    request.site,
  );
  const charLimit = copyCharLimit(platform, contentType);
  const hashtagRule = settings.includeHashtags
    ? contentType === "Ad Headline" ||
      contentType === "Email Copy" ||
      platform === "email"
      ? "No hashtags."
      : platform === "twitter"
        ? "At most 2 hashtags, at the end."
        : "3–5 relevant hashtags at the end, never in the hook."
    : "Do not include hashtags.";
  const corpus = request.crawledCorpus?.promptBlock?.trim();

  return `You are an expert marketing copywriter specializing in ${contentType} for ${platform}.
Brand: ${request.site.brand.name}. Voice: ${voice}. Audience: ${audience}.
${businessCtx ? `Business context: ${businessCtx}. ` : ""}
${userPrefs ? `${userPrefs} ` : ""}
${winning ? `What already works: ${winning} ` : ""}
${corpus ? `${corpus}\n` : ""}
Format: ${typeHint}
Platform style: ${platformHint}
Stay under ${charLimit} characters. ${hashtagRule}
${uniqueness}
${angle !== "auto" ? `Required creative angle: ${getAngleLabel(angle)}.` : "Pick the freshest creative angle that stands out from typical posts."}
First line must work as a standalone hook. No "Excited to announce", "In today's world", "Looking for", or generic marketing filler. Ground every claim in the crawled source of truth and the focus page. Never invent prices, specs, hours, ingredients, or benefits that are not on those pages. One CTA. Return only the final copy — no explanations.`;
}

function buildUserMessage(
  request: GenerateRequest,
  draft: string,
  page: SitePage,
  relatedPages?: SitePage[],
): string {
  const headings = page.headings.slice(0, 6).join(" · ");
  const relatedBlock =
    relatedPages && relatedPages.length > 0
      ? `\n\nRelated crawled pages for factual grounding:\n${relatedPages
          .map(
            (p) =>
              `- ${p.title}: ${p.description || p.excerpt.slice(0, 220)}`,
          )
          .join("\n")}`
      : "";
  const keywords = request.site.brand.keywords.slice(0, 8).join(", ");
  const pain = request.site.brand.businessModel?.painPoints.slice(0, 3).join("; ");
  const corpus = request.crawledCorpus?.promptBlock?.trim();
  const corpusNote = corpus
    ? `\n\nUse the crawled source of truth (${request.crawledCorpus?.siteCount ?? 1} sites, ${request.crawledCorpus?.pageCount ?? 0} pages). Cite only those pages.`
    : "";

  return `Focus page: ${page.title}
Site: ${request.site.brand.name} (${request.site.domain})
URL path: ${page.path}
Description: ${page.description || page.excerpt.slice(0, 420)}
${headings ? `Headings: ${headings}` : ""}
${keywords ? `Brand keywords: ${keywords}` : ""}
${pain ? `Customer pains to speak to: ${pain}` : ""}
Rewrite this draft into stronger ${request.contentType} copy — do not paste it back:
${draft}${request.prompt ? `\nCampaign brief: ${request.prompt}` : ""}${relatedBlock}${corpusNote}`;
}

async function pickRecommendation(
  variants: AiVariant[],
  request: GenerateRequest,
  settings: UserSettings,
): Promise<AiProvider | undefined> {
  if (variants.length < 2) return variants[0]?.provider;

  const judgeKey = process.env.XAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!judgeKey) return variants[0].provider;

  const baseUrl = process.env.XAI_API_KEY
    ? "https://api.x.ai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const model = process.env.XAI_API_KEY ? "grok-3-mini" : "gpt-4o-mini";

  const variantBlock = variants
    .map((v, i) => `Option ${String.fromCharCode(65 + i)} (${v.label}):\n${v.text}`)
    .join("\n\n");

  const goal =
    request.site.brand.businessModel?.conversionGoal ?? "engagement and clicks";

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${judgeKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `You are a marketing director. Pick the best copy variant for ${request.platform} ${request.contentType}. Business goal: ${goal}. Audience: ${settings.targetAudience}. Prefer the more original, scroll-stopping hook, specific facts over vague claims, and a single clear CTA. Reply with only "A" or "B".`,
          },
          { role: "user", content: variantBlock },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) return variants[0].provider;
    const data = await response.json();
    const pick = data.choices?.[0]?.message?.content?.trim()?.toUpperCase();
    if (pick?.startsWith("B") && variants[1]) return variants[1].provider;
    return variants[0].provider;
  } catch {
    return variants[0].provider;
  }
}

export async function enhanceWithDualAi(
  request: GenerateRequest,
  draft: string,
  page: SitePage,
  settings: UserSettings,
  relatedPages?: SitePage[],
): Promise<EnhancementResult> {
  const hasOpenAi = !!process.env.OPENAI_API_KEY;
  const hasXai = !!process.env.XAI_API_KEY;

  if (!hasOpenAi && !hasXai) {
    return { variants: [] };
  }

  const systemPrompt = buildSystemPrompt(
    request,
    settings,
    request.platform,
    request.contentType,
  );
  const userMessage = buildUserMessage(request, draft, page, relatedPages);

  const tasks: Promise<{ provider: AiProvider; text: string | null }>[] = [];
  if (hasOpenAi) {
    tasks.push(
      callProvider("openai", systemPrompt, userMessage).then((text) => ({
        provider: "openai" as const,
        text,
      })),
    );
  }
  if (hasXai) {
    tasks.push(
      callProvider("xai", systemPrompt, userMessage).then((text) => ({
        provider: "xai" as const,
        text,
      })),
    );
  }

  const results = await Promise.all(tasks);
  const variants: AiVariant[] = results
    .filter((r): r is { provider: AiProvider; text: string } => !!r.text)
    .map((r) => ({
      provider: r.provider,
      text: cleanGeneratedCopy(r.text),
      label: PROVIDER_LABELS[r.provider],
    }))
    .filter((v) => v.text.length > 0);

  if (variants.length === 0) return { variants: [] };

  const recommendation = await pickRecommendation(variants, request, settings);
  return { variants, recommendation };
}

export function getAvailableAiProviders(): AiProvider[] {
  const providers: AiProvider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.XAI_API_KEY) providers.push("xai");
  return providers;
}
