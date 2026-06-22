import { enhanceWithDualAi, getAvailableAiProviders } from "./ai-dual";
import {
  planCampaign,
  planItemContentType,
  planItemToPrompt,
} from "./campaign-planner";
import { rankPagesBySimilarity } from "./embeddings";
import { generateAiImage } from "./ai-image";
import {
  buildBusinessInsights,
  suggestVisualTargeting,
} from "./business-context";
import { getAngleLabel } from "./content-angles";
import {
  pickFreshAngle,
  scoreUniqueness,
} from "./content-uniqueness";
import { pickBestImage, buildBrandedImageUrl } from "./image-matcher";
import {
  describeVisualTargeting,
  hasActiveVisualTargeting,
} from "./visual-targeting";
import type {
  BatchGenerateRequest,
  ContentType,
  GeneratedPost,
  GenerateRequest,
  Platform,
  SavedPost,
  SiteData,
  SitePage,
  UserSettings,
} from "./types";

const PLATFORM_LIMITS: Record<Platform, number> = {
  twitter: 280,
  instagram: 2200,
  linkedin: 3000,
  facebook: 5000,
  pinterest: 500,
  email: 5000,
};

const DEFAULT_SETTINGS: UserSettings = {
  brandVoice: "Professional yet approachable.",
  targetAudience: "General audience",
  defaultPlatforms: ["instagram", "linkedin", "twitter"],
  includeHashtags: true,
  emojiStyle: "light",
  preferAiImages: false,
};

function getSettings(request: GenerateRequest): UserSettings {
  return { ...DEFAULT_SETTINGS, ...request.settings };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scorePageRelevance(
  page: SitePage,
  prompt: string,
  contentType: ContentType,
): number {
  let score = 0;
  const promptTokens = new Set(tokenize(prompt));

  const pageText = `${page.title} ${page.description} ${page.headings.join(" ")} ${page.excerpt}`;
  const pageTokens = tokenize(pageText);

  for (const token of pageTokens) {
    if (promptTokens.has(token)) score += 8;
  }

  if (page.path === "/") score += 15;
  if (page.images.length > 0) score += page.images.length * 3;
  if (page.description.length > 50) score += 10;

  const typeBoost: Partial<Record<ContentType, RegExp>> = {
    "Product Description": /product|pricing|features|plan/i,
    "Blog Intro": /blog|article|news|insights/i,
    "Ad Headline": /pricing|demo|trial|get started|sign up/i,
    "Email Copy": /about|contact|team/i,
    "Video Ad": /video|demo|showcase/i,
  };
  const pattern = typeBoost[contentType];
  if (pattern?.test(pageText)) score += 25;

  if (siteBusinessKeywordsMatch(page, prompt)) score += 12;

  return score;
}

function siteBusinessKeywordsMatch(page: SitePage, prompt: string): boolean {
  const combined = `${page.title} ${page.description}`.toLowerCase();
  return tokenize(prompt).some((t) => combined.includes(t));
}

async function pickPage(
  site: SiteData,
  sourcePageUrl?: string,
  prompt = "",
  contentType: ContentType = "Social Post",
): Promise<SitePage> {
  if (sourcePageUrl) {
    return site.pages.find((p) => p.url === sourcePageUrl) ?? site.pages[0];
  }

  const query = [prompt, contentType].filter(Boolean).join(" — ");
  if (query.trim()) {
    const semantic = await rankPagesBySimilarity(site.pages, query);
    if (semantic[0] && semantic[0].score > 0.3) return semantic[0].page;

    const scored = site.pages.map((page) => ({
      page,
      score: scorePageRelevance(page, prompt, contentType),
    }));
    scored.sort((a, b) => b.score - a.score);
    if (scored[0] && scored[0].score > 0) return scored[0].page;
  }

  return site.pages.find((p) => p.path === "/") ?? site.pages[0];
}

async function getRelatedPages(
  site: SiteData,
  page: SitePage,
  prompt: string,
  contentType: ContentType,
): Promise<SitePage[]> {
  const query = [prompt, contentType, page.title].filter(Boolean).join(" — ");
  const ranked = await rankPagesBySimilarity(site.pages, query);
  return ranked
    .filter((r) => r.page.url !== page.url && r.score > 0.25)
    .slice(0, 3)
    .map((r) => r.page);
}

function emojiPrefix(style: UserSettings["emojiStyle"], platform: Platform): string {
  if (style === "none" || platform === "linkedin" || platform === "email") return "";
  if (style === "heavy") return "🚀✨ ";
  return "✨ ";
}

function buildHashtags(
  site: SiteData,
  page: SitePage,
  prompt: string,
  settings: UserSettings,
): string[] {
  if (!settings.includeHashtags) return [];

  const tags = new Set<string>();
  const hostname = new URL(site.domain).hostname.replace(/\./g, "");
  tags.add(hostname);

  for (const kw of site.brand.keywords.slice(0, 4)) {
    tags.add(kw.replace(/\s+/g, ""));
  }
  for (const heading of page.headings.slice(0, 2)) {
    const word = heading.split(/\s+/)[0]?.toLowerCase();
    if (word && word.length > 3) tags.add(word);
  }
  for (const word of prompt.toLowerCase().split(/\s+/)) {
    if (word.length > 4 && !/^(about|their|would|could)$/.test(word)) {
      tags.add(word);
    }
  }

  return Array.from(tags)
    .slice(0, 6)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

function hook(page: SitePage, brand: SiteData["brand"]): string {
  const candidate =
    page.headings[0] ||
    page.description ||
    page.excerpt.split(/[.!?]/)[0]?.trim();
  return candidate || brand.tagline;
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1).trimEnd() + "…";
}

function businessHook(site: SiteData): string {
  const bm = site.brand.businessModel;
  if (!bm) return "";
  if (bm.painPoints.length > 0) {
    return `Tired of ${bm.painPoints[0].toLowerCase()}? `;
  }
  return "";
}

function socialPost(
  site: SiteData,
  page: SitePage,
  platform: Platform,
  prompt: string,
  settings: UserSettings,
): string {
  const h = hook(page, site.brand);
  const body = page.description || page.excerpt.slice(0, 200);
  const cta = `→ ${site.domain}${page.path === "/" ? "" : page.path}`;
  const prefix = emojiPrefix(settings.emojiStyle, platform);
  const bm = site.brand.businessModel;

  let post = `${prefix}${businessHook(site)}${h}\n\n${body}`;
  if (bm?.valueProposition) {
    post += `\n\n${bm.valueProposition}`;
  }
  if (settings.targetAudience) {
    post += `\n\nBuilt for ${settings.targetAudience}.`;
  }
  if (prompt) post += `\n\n💡 ${prompt}`;
  post += `\n\n${cta}`;

  const hashtags = buildHashtags(site, page, prompt, settings);
  if (hashtags.length > 0) {
    post += `\n\n${hashtags.join(" ")}`;
  }

  return truncate(post, PLATFORM_LIMITS[platform]);
}

function emailCopy(
  site: SiteData,
  page: SitePage,
  _platform: Platform,
  prompt: string,
  settings: UserSettings,
): string {
  const highlights = site.pages
    .slice(0, 4)
    .map((p) => `• ${p.title}: ${p.description || p.excerpt.slice(0, 100)}`)
    .join("\n");

  return truncate(
    `Subject: ${hook(page, site.brand)} — ${site.brand.name}\n\nHi there,\n\n${page.description || page.excerpt}\n\nHighlights from our site:\n${highlights}${prompt ? `\n\nFocus: ${prompt}` : ""}${settings.targetAudience ? `\n\nFor: ${settings.targetAudience}` : ""}\n\nExplore more at ${site.domain}`,
    4000,
  );
}

function adHeadline(site: SiteData, page: SitePage): string {
  return truncate(`${hook(page, site.brand)} | ${site.brand.name}`, 90);
}

function blogIntro(
  site: SiteData,
  page: SitePage,
  _platform: Platform,
  prompt: string,
  settings: UserSettings,
): string {
  const topics = site.brand.topics.slice(0, 4).join(", ");
  return truncate(
    `${page.description || page.excerpt}\n\nAt ${site.brand.name}, we explore ${topics || "what matters most"}.${settings.targetAudience ? ` Written for ${settings.targetAudience}.` : ""}${prompt ? ` Focus: ${prompt}.` : ""} Read more at ${site.domain}${page.path}.`,
    1200,
  );
}

function productDescription(site: SiteData, page: SitePage): string {
  const features = page.headings.slice(0, 4).join(" · ");
  return truncate(
    `${page.title}. ${page.description || page.excerpt}${features ? `\n\nKey highlights: ${features}` : ""}\n\nLearn more at ${site.domain}${page.path}.`,
    1000,
  );
}

function videoAd(
  site: SiteData,
  page: SitePage,
  platform: Platform,
  prompt: string,
  settings: UserSettings,
): string {
  const h = hook(page, site.brand);
  const body = page.description || page.excerpt.slice(0, 120);
  const cta = `→ ${site.domain}${page.path === "/" ? "" : page.path}`;
  const prefix = emojiPrefix(settings.emojiStyle, platform);

  let script = `${prefix}${h}\n\n${body}`;
  if (settings.targetAudience) {
    script += `\n\nFor ${settings.targetAudience}.`;
  }
  if (prompt) script += `\n\n${prompt}`;
  script += `\n\n${cta}`;

  const hashtags = buildHashtags(site, page, prompt, settings);
  if (hashtags.length > 0) {
    script += `\n\n${hashtags.join(" ")}`;
  }

  return truncate(script, PLATFORM_LIMITS[platform]);
}

const generators: Record<
  ContentType,
  (
    site: SiteData,
    page: SitePage,
    platform: Platform,
    prompt: string,
    settings: UserSettings,
  ) => string
> = {
  "Social Post": socialPost,
  "Email Copy": emailCopy,
  "Ad Headline": (site, page, _platform, _prompt, _settings) =>
    adHeadline(site, page),
  "Blog Intro": blogIntro,
  "Product Description": (site, page, _platform, _prompt, _settings) =>
    productDescription(site, page),
  "Video Ad": videoAd,
};

function buildInsights(
  site: SiteData,
  page: SitePage,
  imageSource: GeneratedPost["image"]["source"],
  platform: Platform,
  settings: UserSettings,
  aiProviders: string[],
): string[] {
  const matchType = page.embedding ? "Semantic match" : "Smart-matched";
  const insights = [
    `${matchType} for page "${page.title}" (${page.path}).`,
    site.brand.synthesis
      ? `Brand voice: ${site.brand.synthesis.voiceGuide.slice(0, 80)}…`
      : `Brand tone: ${site.brand.tone}. Voice: ${settings.brandVoice.slice(0, 60)}…`,
    ...buildBusinessInsights(site.brand),
    `Keywords: ${site.brand.keywords.slice(0, 5).join(", ")}.`,
    imageSource === "site"
      ? "Used highest-scoring image from crawled pages."
      : imageSource === "ai"
        ? "Generated unique AI visual tailored to your brand and page."
        : "Generated branded visual — no suitable site image found.",
    `Optimized for ${platform} (${PLATFORM_LIMITS[platform]} chars).`,
  ];

  if (aiProviders.length === 2) {
    insights.push(
      "Compared GPT-4o mini and Grok 3 mini — picked the best fit for your business goal.",
    );
  } else if (aiProviders.length === 1) {
    insights.push(`AI-enhanced with ${aiProviders[0] === "openai" ? "GPT-4o mini" : "Grok 3 mini"}.`);
  }

  return insights;
}

async function resolveImage(
  site: SiteData,
  page: SitePage,
  platform: Platform,
  context: string,
  preferAi: boolean,
  visualTargeting?: GenerateRequest["visualTargeting"],
): Promise<GeneratedPost["image"]> {
  if (preferAi) {
    const ai = await generateAiImage(site, page, platform, visualTargeting);
    if (ai) {
      if (ai.url.startsWith("data:")) {
        return {
          url: ai.url,
          source: "ai",
          alt: `${site.brand.name} — ${page.title}`,
        };
      }

      try {
        const res = await fetch(ai.url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const ct = res.headers.get("content-type") ?? "image/png";
          return {
            url: `data:${ct};base64,${b64}`,
            source: "ai",
            alt: `${site.brand.name} — ${page.title}`,
            originalUrl: ai.url,
          };
        }
      } catch {
        /* fall through to branded placeholder */
      }
    }

    return {
      url: buildBrandedImageUrl(site, page.title, platform, page.path),
      source: "branded",
      alt: `${site.brand.name} — ${page.title}`,
    };
  }

  const siteImage = pickBestImage(site, context, page, platform);
  if (siteImage) {
    return {
      url: `/api/image?url=${encodeURIComponent(siteImage.url)}`,
      source: "site",
      alt: siteImage.alt || page.title,
      originalUrl: siteImage.url,
    };
  }

  return {
    url: buildBrandedImageUrl(site, page.title, platform, page.path),
    source: "branded",
    alt: `${site.brand.name} — ${page.title}`,
  };
}

export async function generateSmartPost(
  request: GenerateRequest,
): Promise<GeneratedPost> {
  const settings = getSettings(request);
  const {
    site,
    contentType,
    platform,
    prompt = "",
    sourcePageUrl,
    existingPosts = [],
  } = request;
  const contentAngle =
    request.contentAngle === "auto" || !request.contentAngle
      ? pickFreshAngle(existingPosts, 0, request.contentAngle)
      : request.contentAngle;
  const angleRequest = { ...request, contentAngle };
  const page = await pickPage(site, sourcePageUrl, prompt, contentType);
  const relatedPages = await getRelatedPages(site, page, prompt, contentType);
  const text =
    platform === "email" && contentType === "Social Post"
      ? emailCopy(site, page, platform, prompt, settings)
      : generators[contentType](site, page, platform, prompt, settings);
  const hashtags = buildHashtags(site, page, prompt, settings);

  const context = `${page.title} ${page.description} ${prompt}`;
  const isVideoAd = contentType === "Video Ad";
  const preferAi =
    isVideoAd || (request.preferAiImage ?? settings.preferAiImages ?? false);

  const effectiveTargeting = suggestVisualTargeting(
    site.brand,
    platform,
    request.visualTargeting,
  );

  const image = await resolveImage(
    site,
    page,
    platform,
    context,
    preferAi,
    effectiveTargeting,
  );

  const { variants, recommendation } = await enhanceWithDualAi(
    angleRequest,
    text,
    page,
    settings,
    relatedPages,
  );

  const selectedVariant =
    variants.find((v) => v.provider === recommendation) ?? variants[0];
  const finalText = selectedVariant?.text ?? text;

  const aiProviders = getAvailableAiProviders();
  const insights = buildInsights(
    site,
    page,
    image.source,
    platform,
    settings,
    aiProviders,
  );

  if (preferAi && image.source !== "ai") {
    insights.push(
      "AI image generation failed — using branded placeholder. Check OPENAI_API_KEY or XAI_API_KEY on the server.",
    );
  }
  if (isVideoAd) {
    insights.push(
      "AI video ad — short-form vertical/horizontal creative generated from your brand.",
    );
  }
  if (hasActiveVisualTargeting(effectiveTargeting)) {
    insights.push(
      `Visual direction: ${describeVisualTargeting(effectiveTargeting).join(", ")}.`,
    );
  } else if (preferAi && site.brand.businessModel) {
    insights.push(
      `Auto-targeted visuals for ${site.brand.businessModel.type} business on ${platform}.`,
    );
  }

  const uniqueness = scoreUniqueness(
    finalText,
    existingPosts,
    page.path,
    contentAngle,
  );

  if (contentAngle !== "auto") {
    insights.push(`Creative angle: ${getAngleLabel(contentAngle)}.`);
  }
  insights.push(`Uniqueness score: ${uniqueness.score}/100 — ${uniqueness.tips[0]}`);

  return {
    text: finalText,
    hashtags,
    cta: `${site.domain}${page.path === "/" ? "" : page.path}`,
    platform,
    contentType,
    image,
    insights,
    sourcePage: page.path,
    characterCount: finalText.length,
    createdAt: new Date().toISOString(),
    aiVariants: variants.length > 0 ? variants : undefined,
    selectedProvider: selectedVariant?.provider,
    aiRecommendation: recommendation,
    originalText: finalText,
    contentAngle,
    uniqueness,
  };
}

export async function generateCampaignPack(
  request: BatchGenerateRequest,
): Promise<SavedPost[]> {
  const {
    site,
    settings,
    prompt = "",
    maxPosts = 9,
  } = request;

  const plan = await planCampaign(request);
  const posts: SavedPost[] = [];
  const history = [
    ...(request.existingPosts ?? []),
    ...posts.map((p) => ({
      text: p.text,
      sourcePage: p.sourcePage,
      platform: p.platform,
    })),
  ];
  const varyAngles = request.varyAngles !== false;

  for (const [index, item] of plan.items.slice(0, maxPosts).entries()) {
    const page = site.pages.find((p) => p.path === item.pagePath);
    if (!page) continue;

    const itemPrompt = planItemToPrompt(item, prompt);
    const contentAngle = varyAngles
      ? pickFreshAngle(history, index, request.contentAngle)
      : request.contentAngle ?? "auto";

    const post = await generateSmartPost({
      site,
      contentType: planItemContentType(),
      platform: item.platform,
      prompt: itemPrompt,
      sourcePageUrl: page.url,
      settings,
      preferAiImage: request.preferAiImage ?? settings?.preferAiImages,
      visualTargeting: request.visualTargeting,
      contentAngle,
      existingPosts: history,
    });

    history.push({
      text: post.text,
      sourcePage: post.sourcePage,
      platform: post.platform,
    });

    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + item.dayOffset);

    posts.push({
      ...post,
      id: `${Date.now()}-${posts.length}`,
      createdAt: new Date().toISOString(),
      scheduledFor: scheduled.toISOString().split("T")[0],
      insights: [
        `Campaign: ${plan.theme} (${plan.source === "ai" ? "AI-planned" : "smart calendar"}).`,
        `Angle: ${item.angle} on ${item.platform}.`,
        ...post.insights,
      ],
    });
  }

  return posts;
}

