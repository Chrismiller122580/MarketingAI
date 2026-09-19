import { enhanceWithDualAi, getAvailableAiProviders, cleanGeneratedCopy } from "./ai-dual";
import {
  planCampaign,
  planItemContentType,
  planItemToPrompt,
  type CampaignPlan,
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
import {
  getVisualCanvasSize,
  isInstagramFormat,
  isVerticalContentType,
  isVideoContentType,
} from "./content-formats";
import { storyEditorLayers } from "./visual-editor-presets";
import { pickBestImage, buildBrandedImageUrl } from "./image-matcher";
import { uploadToBlob } from "@/lib/blob-storage";
import {
  describeVisualTargeting,
  hasActiveVisualTargeting,
} from "./visual-targeting";
import { generateInfluencerSiteContent } from "./viraforge/influencer-content";
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
    Reel: /video|demo|showcase|launch|trend/i,
    Story: /announce|new|launch|offer|event/i,
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
  _page: SitePage,
  prompt: string,
  settings: UserSettings,
  platform: Platform = "instagram",
): string[] {
  if (!settings.includeHashtags) return [];
  if (platform === "email") return [];

  const tags: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "");
    if (cleaned.length < 3 || cleaned.length > 24) return;
    if (/^(about|their|would|could|with|from|this|that|your|have)$/i.test(cleaned)) {
      return;
    }
    const tag = cleaned.toLowerCase();
    if (seen.has(tag)) return;
    seen.add(tag);
    tags.push(`#${cleaned}`);
  };

  push(site.brand.name.replace(/\s+/g, ""));
  for (const kw of site.brand.keywords.slice(0, 4)) {
    push(kw.replace(/\s+/g, ""));
  }
  for (const word of prompt.toLowerCase().split(/\s+/)) {
    if (word.length > 5) push(word);
  }

  const max =
    platform === "twitter" ? 2 : platform === "linkedin" ? 3 : 5;
  return tags.slice(0, max);
}

function extractHashtags(text: string): string[] {
  return Array.from(text.matchAll(/#[A-Za-z0-9_]+/g)).map((match) => match[0]);
}

function ensureHashtagsInText(
  text: string,
  tags: string[],
  include: boolean,
): string {
  if (!include || tags.length === 0) return text;
  if (/#[A-Za-z]/.test(text)) return text;
  return `${text.trim()}\n\n${tags.join(" ")}`;
}

function firstSentence(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const match = cleaned.match(/^.+?[.!?](?:\s|$)/);
  const sentence = (match?.[0] ?? cleaned).trim();
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

function hook(page: SitePage, brand: SiteData["brand"]): string {
  const candidate =
    page.headings[0] ||
    firstSentence(page.description, 90) ||
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
  const proof =
    firstSentence(page.description || page.excerpt, 180) ||
    site.brand.businessModel?.valueProposition ||
    site.brand.tagline;
  const cta = `→ ${site.domain}${page.path === "/" ? "" : page.path}`;
  const prefix = emojiPrefix(settings.emojiStyle, platform);
  const pain = businessHook(site);

  let post = `${prefix}${pain}${h}`;
  if (proof && proof.toLowerCase() !== h.toLowerCase()) {
    post += `\n\n${proof}`;
  }
  post += `\n\n${cta}`;

  const hashtags = buildHashtags(site, page, prompt, settings, platform);
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
  const subject = hook(page, site.brand);
  const opener =
    site.brand.businessModel?.valueProposition ||
    firstSentence(page.description || page.excerpt, 220) ||
    site.brand.tagline;
  const highlights = site.pages
    .slice(0, 3)
    .map((p) => `• ${p.title}`)
    .join("\n");

  return truncate(
    `Subject: ${subject}\n\n${opener}\n\n${highlights ? `Worth a look:\n${highlights}\n\n` : ""}${prompt ? `${prompt}\n\n` : ""}See it here: ${site.domain}${page.path === "/" ? "" : page.path}${settings.targetAudience ? `\n\nWritten for ${settings.targetAudience}.` : ""}`,
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
  const proof = firstSentence(page.description || page.excerpt, 120);
  const cta = `→ ${site.domain}${page.path === "/" ? "" : page.path}`;
  const prefix = emojiPrefix(settings.emojiStyle, platform);

  let script = `${prefix}${h}`;
  if (proof && proof.toLowerCase() !== h.toLowerCase()) {
    script += `\n\n${proof}`;
  }
  script += `\n\n${cta}`;

  const hashtags = buildHashtags(site, page, prompt, settings, platform);
  if (hashtags.length > 0) {
    script += `\n\n${hashtags.join(" ")}`;
  }

  return truncate(script, PLATFORM_LIMITS[platform]);
}

function reelCaption(
  site: SiteData,
  page: SitePage,
  _platform: Platform,
  prompt: string,
  settings: UserSettings,
): string {
  const h = hook(page, site.brand);
  const proof = firstSentence(page.description || page.excerpt, 100);
  const prefix = emojiPrefix(settings.emojiStyle, "instagram");
  const hashtags = buildHashtags(site, page, prompt, settings, "instagram").slice(0, 5);

  let script = `${prefix}${h}`;
  if (proof && proof.toLowerCase() !== h.toLowerCase()) {
    script += `\n\n${proof}`;
  }
  script += `\n\nSave this.`;
  if (hashtags.length > 0) {
    script += `\n\n${hashtags.join(" ")}`;
  }

  return truncate(script, 2200);
}

function storyCaption(
  site: SiteData,
  page: SitePage,
  _platform: Platform,
  prompt: string,
  settings: UserSettings,
): string {
  const h = hook(page, site.brand);
  const prefix = emojiPrefix(settings.emojiStyle, "instagram");
  const cta = `Swipe up → ${site.domain}${page.path === "/" ? "" : page.path}`;

  let script = `${prefix}${h}`;
  if (prompt) script += `\n${prompt.slice(0, 80)}`;
  script += `\n\n${cta}`;
  if (settings.targetAudience) {
    script += `\n\nFor ${settings.targetAudience}.`;
  }

  return truncate(script, 500);
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
  "Ad Headline": (site: SiteData, page: SitePage, ..._args: unknown[]) => // eslint-disable-line @typescript-eslint/no-unused-vars
    adHeadline(site, page),
  "Blog Intro": blogIntro,
  "Product Description": (site: SiteData, page: SitePage, ..._args: unknown[]) => // eslint-disable-line @typescript-eslint/no-unused-vars
    productDescription(site, page),
  "Video Ad": videoAd,
  Reel: reelCaption,
  Story: storyCaption,
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
        : imageSource === "influencer"
          ? "Used influencer media from Creator Studio (motion clip or portrait)."
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

function resolveInfluencerMedia(
  request: GenerateRequest,
  page: SitePage,
  contentType: ContentType,
): GeneratedPost["image"] | null {
  const influencer = request.influencer;
  if (!influencer || request.useInfluencerPortrait === false) return null;

  const portraitUrl = influencer.assets.portraitUrl;
  const motionUrl = influencer.assets.videoUrl;
  const generateFresh =
    request.generateFreshMotion ?? request.generateFreshTalkMotion;
  const useSavedMotion =
    !generateFresh &&
    (request.influencerVisualMode === "saved" ||
      (request.influencerVisualMode !== "portrait" &&
        request.useInfluencerMotion !== false)) &&
    motionUrl &&
    influencer.assets.motionStatus === "ready";

  const alt = `${influencer.displayName} (@${influencer.handle}) — ${page.title}`;
  const vertical = isVerticalContentType(contentType)
    ? { aspectRatio: "9:16" as const }
    : {};

  if (generateFresh && portraitUrl) {
    return {
      url: portraitUrl,
      source: "influencer",
      alt,
      originalUrl: portraitUrl,
      videoStatus: "processing",
      aspectRatio: "9:16",
      ...vertical,
    };
  }

  if (useSavedMotion && motionUrl) {
    const isTalk = influencer.assets.motionType === "talk";
    return {
      url: motionUrl,
      source: "influencer",
      alt,
      originalUrl: motionUrl,
      videoUrl: motionUrl,
      videoStatus: "ready",
      motionType: influencer.assets.motionType,
      ...(isTalk && influencer.assets.voiceAudioUrl
        ? {
            audioUrl: influencer.assets.voiceAudioUrl,
            voiceoverScript: influencer.assets.lastScript,
          }
        : {}),
      ...vertical,
    };
  }

  if (!portraitUrl) return null;

  return {
    url: portraitUrl,
    source: "influencer",
    alt,
    originalUrl: portraitUrl,
    ...vertical,
  };
}

async function resolveImage(
  site: SiteData,
  page: SitePage,
  platform: Platform,
  context: string,
  preferAi: boolean,
  visualTargeting?: GenerateRequest["visualTargeting"],
  contentType: ContentType = "Social Post",
  request?: GenerateRequest,
): Promise<GeneratedPost["image"]> {
  const influencerImage = request
    ? resolveInfluencerMedia(request, page, contentType)
    : null;
  if (influencerImage) return influencerImage;
  const brandedFormat =
    contentType === "Story" ? "story" : contentType === "Reel" ? "reel" : undefined;

  if (preferAi) {
    const ai = await generateAiImage(
      site,
      page,
      platform,
      visualTargeting,
      contentType,
    );
    const alt = `${site.brand.name} — ${page.title}`;
    if (ai) {
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      let imageUrl = ai.url;
      const originalUrl = ai.url;

      if (ai.url.startsWith("data:")) {
        if (blobToken) {
          try {
            const base64Data = ai.url.split(",")[1] || "";
            const buffer = Buffer.from(base64Data, "base64");
            const filename = `ai-images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
            imageUrl = await uploadToBlob(filename, buffer, "image/png");
          } catch {
            // keep data: url as fallback
          }
        }
        return {
          url: imageUrl,
          source: "ai",
          alt,
          originalUrl,
          ...(isVerticalContentType(contentType)
            ? { aspectRatio: "9:16" as const }
            : {}),
        };
      }

      try {
        const res = await fetch(ai.url);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const ct = res.headers.get("content-type") ?? "image/png";
          if (blobToken) {
            try {
              const ext = ct.includes("png") ? "png" : "jpg";
              const filename = `ai-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
              imageUrl = await uploadToBlob(filename, buffer, ct);
            } catch {
              // fallback to inline
              const b64 = buffer.toString("base64");
              imageUrl = `data:${ct};base64,${b64}`;
            }
          } else {
            const b64 = buffer.toString("base64");
            imageUrl = `data:${ct};base64,${b64}`;
          }
          return {
            url: imageUrl,
            source: "ai",
            alt,
            originalUrl,
            ...(isVerticalContentType(contentType)
              ? { aspectRatio: "9:16" as const }
              : {}),
          };
        }
      } catch {
        /* fall through to branded placeholder */
      }
    }

    return {
      url: buildBrandedImageUrl(site, page.title, platform, page.path, brandedFormat),
      source: "branded",
      alt,
      ...(isVerticalContentType(contentType)
        ? { aspectRatio: "9:16" as const }
        : {}),
    };
  }

  const siteImage = pickBestImage(site, context, page, platform);
  if (siteImage && !isVerticalContentType(contentType)) {
    return {
      url: `/api/image?url=${encodeURIComponent(siteImage.url)}`,
      source: "site",
      alt: siteImage.alt || page.title,
      originalUrl: siteImage.url,
    };
  }

  return {
    url: buildBrandedImageUrl(site, page.title, platform, page.path, brandedFormat),
    source: "branded",
    alt: `${site.brand.name} — ${page.title}`,
    ...(isVerticalContentType(contentType)
      ? { aspectRatio: "9:16" as const }
      : {}),
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

  let text =
    platform === "email" && contentType === "Social Post"
      ? emailCopy(site, page, platform, prompt, settings)
      : generators[contentType](site, page, platform, prompt, settings);
  let influencerInsights: string[] = [];

  if (request.influencer && request.influencerVoice) {
    const influencerPost = await generateInfluencerSiteContent({
      persona: request.influencer.persona,
      facts: request.influencer.facts,
      pinpoints: request.influencer.pinpoints,
      site,
      page,
      platform:
        isInstagramFormat(contentType) ? "instagram" : platform,
      brief: prompt || undefined,
      personalization: request.influencer.personalization,
    });
    text = truncate(influencerPost.text, PLATFORM_LIMITS[platform]);
    influencerInsights = [
      `Influencer voice: @${request.influencer.handle} with fact-locked citations.`,
      `Cited ${influencerPost.citedFacts.length} verified fact(s) from crawl + product facts.`,
    ];
    if (!influencerPost.validation.valid) {
      influencerInsights.push(
        "Fact validation flagged possible issues — review copy before publishing.",
      );
    }
  }

  const isVideoContent = isVideoContentType(contentType);
  const isStory = contentType === "Story";
  const effectivePlatform = isInstagramFormat(contentType) ? "instagram" : platform;
  const hashtags = buildHashtags(site, page, prompt, settings, effectivePlatform);

  const context = `${page.title} ${page.description} ${prompt}`;
  const preferAi =
    isVideoContent ||
    isStory ||
    (request.preferAiImage ?? settings.preferAiImages ?? false);

  const effectiveTargeting = suggestVisualTargeting(
    site.brand,
    platform,
    request.visualTargeting,
  );

  let image = await resolveImage(
    site,
    page,
    effectivePlatform,
    context,
    preferAi,
    effectiveTargeting,
    contentType,
    request,
  );

  const useInfluencerVoice = !!(request.influencer && request.influencerVoice);
  const { variants, recommendation } = useInfluencerVoice
    ? { variants: [], recommendation: undefined as undefined }
    : await enhanceWithDualAi(
        angleRequest,
        text,
        page,
        settings,
        relatedPages,
      );

  const selectedVariant =
    variants.find((v) => v.provider === recommendation) ?? variants[0];
  const cleanedText = cleanGeneratedCopy(selectedVariant?.text ?? text);
  const withHashtags = ensureHashtagsInText(
    cleanedText,
    hashtags,
    settings.includeHashtags &&
      contentType !== "Ad Headline" &&
      contentType !== "Email Copy" &&
      effectivePlatform !== "email",
  );
  const finalText = truncate(
    withHashtags,
    PLATFORM_LIMITS[effectivePlatform] ?? PLATFORM_LIMITS[platform],
  );
  const displayHashtags =
    extractHashtags(finalText).length > 0
      ? extractHashtags(finalText)
      : hashtags;

  const aiProviders = getAvailableAiProviders();
  const insights = [
    ...buildInsights(
      site,
      page,
      image.source,
      platform,
      settings,
      useInfluencerVoice ? [] : aiProviders,
    ),
    ...influencerInsights,
  ];

  if (preferAi && image.source !== "ai") {
    insights.push(
      "AI image generation failed — using a branded placeholder instead.",
    );
  }
  if (contentType === "Reel") {
    insights.push(
      "Instagram Reel — 9:16 vertical video with hook-first caption and trend-ready pacing.",
    );
  } else if (isStory) {
    insights.push(
      request.storyMedia === "video"
        ? "Instagram Story video — 9:16 short clip via Replicate with swipe-up copy."
        : "Instagram Story — full-screen 9:16 visual with story text overlays ready to edit.",
    );
  } else if (isVideoContent) {
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

  if (isStory && request.storyMedia !== "video") {
    const { width, height } = getVisualCanvasSize(effectivePlatform, contentType);
    const draftPost: GeneratedPost = {
      text: finalText,
      hashtags: displayHashtags,
      cta: `${site.domain}${page.path === "/" ? "" : page.path}`,
      platform: effectivePlatform,
      contentType,
      image,
      insights: [],
      characterCount: finalText.length,
    };
    image = {
      ...image,
      overlays: storyEditorLayers(
        draftPost,
        site.brand.name,
        site.brand.themeColor,
        width,
        height,
      ),
    };
  }

  return {
    text: finalText,
    hashtags: displayHashtags,
    cta: `${site.domain}${page.path === "/" ? "" : page.path}`,
    platform: effectivePlatform,
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
): Promise<{ posts: SavedPost[]; plan: CampaignPlan }> {
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

  const items = plan.items.slice(0, maxPosts);
  const CONCURRENCY = 3;

  async function generatePackItem(index: number) {
    const item = items[index];
    const page = site.pages.find((p) => p.path === item.pagePath);
    if (!page) return null;

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

    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + item.dayOffset);

    return {
      index,
      post: {
        ...post,
        id: `${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        scheduledFor: scheduled.toISOString().split("T")[0],
        insights: [
          `Campaign: ${plan.theme} (${plan.source === "ai" ? "AI-planned" : "smart calendar"}).`,
          `Angle: ${item.angle} on ${item.platform}.`,
          ...post.insights,
        ],
      } as SavedPost,
      historyEntry: {
        text: post.text,
        sourcePage: post.sourcePage,
        platform: post.platform,
      },
    };
  }

  for (let offset = 0; offset < items.length; offset += CONCURRENCY) {
    const batch = await Promise.all(
      Array.from(
        { length: Math.min(CONCURRENCY, items.length - offset) },
        (_, i) => generatePackItem(offset + i),
      ),
    );

    const completed = batch
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => a.index - b.index);

    for (const result of completed) {
      history.push(result.historyEntry);
      posts.push(result.post);
    }
  }

  return { posts, plan };
}

