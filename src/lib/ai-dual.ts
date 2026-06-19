import { callProvider } from "./ai-client";
import { formatVoiceGuide } from "./brand-synthesis";
import { formatPromptPreferences } from "./learning-preferences";
import {
  formatBusinessContext,
  platformCopyHint,
} from "./business-context";
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

function buildSystemPrompt(
  request: GenerateRequest,
  settings: UserSettings,
  platform: Platform,
  contentType: ContentType,
): string {
  const voice = formatVoiceGuide(request.site.brand);
  const audience =
    request.site.brand.synthesis?.audiencePersona || settings.targetAudience;
  const businessCtx = formatBusinessContext(request.site.brand);
  const platformHint = platformCopyHint(platform);

  const userPrefs = formatPromptPreferences(settings.promptPreferences);

  return `You are an expert marketing copywriter specializing in ${contentType} for ${platform}.
Brand: ${request.site.brand.name}. Voice: ${voice}. Audience: ${audience}.
${businessCtx ? `Business context: ${businessCtx}. ` : ""}
${userPrefs ? `${userPrefs} ` : ""}
Platform style: ${platformHint}
Write copy that drives the business conversion goal. Return only the final copy — no explanations.`;
}

function buildUserMessage(
  request: GenerateRequest,
  draft: string,
  page: SitePage,
  relatedPages?: SitePage[],
): string {
  const relatedBlock =
    relatedPages && relatedPages.length > 0
      ? `\n\nRelated site content for factual grounding:\n${relatedPages
          .map(
            (p) =>
              `- ${p.title}: ${p.description || p.excerpt.slice(0, 150)}`,
          )
          .join("\n")}`
      : "";

  return `Page: ${page.title}
Description: ${page.description || page.excerpt.slice(0, 200)}
Draft:
${draft}${request.prompt ? `\nCampaign brief: ${request.prompt}` : ""}${relatedBlock}`;
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
            content: `You are a marketing director. Pick the best copy variant for ${request.platform}. Business goal: ${goal}. Audience: ${settings.targetAudience}. Reply with only "A" or "B".`,
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
      text: r.text,
      label: PROVIDER_LABELS[r.provider],
    }));

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