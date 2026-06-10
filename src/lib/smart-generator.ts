import { pickBestImage, buildBrandedImageUrl } from "./image-matcher";
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
};

const DEFAULT_SETTINGS: UserSettings = {
  brandVoice: "Professional yet approachable.",
  targetAudience: "General audience",
  defaultPlatforms: ["instagram", "linkedin", "twitter"],
  includeHashtags: true,
  emojiStyle: "light",
};

function getSettings(request: GenerateRequest): UserSettings {
  return { ...DEFAULT_SETTINGS, ...request.settings };
}

function pickPage(site: SiteData, sourcePageUrl?: string): SitePage {
  if (sourcePageUrl) {
    return site.pages.find((p) => p.url === sourcePageUrl) ?? site.pages[0];
  }
  return site.pages.find((p) => p.path === "/") ?? site.pages[0];
}

function emojiPrefix(style: UserSettings["emojiStyle"], platform: Platform): string {
  if (style === "none" || platform === "linkedin") return "";
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

  let post = `${prefix}${h}\n\n${body}`;
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
};

function buildInsights(
  site: SiteData,
  page: SitePage,
  imageSource: GeneratedPost["image"]["source"],
  platform: Platform,
  settings: UserSettings,
): string[] {
  const insights = [
    `Matched content from "${page.title}" (${page.path}).`,
    `Brand tone: ${site.brand.tone}. Voice: ${settings.brandVoice.slice(0, 60)}…`,
    `Keywords: ${site.brand.keywords.slice(0, 5).join(", ")}.`,
    imageSource === "site"
      ? "Used highest-scoring image from crawled pages."
      : "Generated branded visual — no suitable site image found.",
    `Optimized for ${platform} (${PLATFORM_LIMITS[platform]} chars).`,
  ];
  return insights;
}

export async function generateSmartPost(
  request: GenerateRequest,
): Promise<GeneratedPost> {
  const settings = getSettings(request);
  const { site, contentType, platform, prompt = "", sourcePageUrl } = request;
  const page = pickPage(site, sourcePageUrl);
  const text = generators[contentType](site, page, platform, prompt, settings);
  const hashtags = buildHashtags(site, page, prompt, settings);

  const context = `${page.title} ${page.description} ${prompt}`;
  const siteImage = pickBestImage(site, context, page, platform);

  let image: GeneratedPost["image"];
  if (siteImage) {
    image = {
      url: `/api/image?url=${encodeURIComponent(siteImage.url)}`,
      source: "site",
      alt: siteImage.alt || page.title,
      originalUrl: siteImage.url,
    };
  } else {
    image = {
      url: buildBrandedImageUrl(site, page.title, platform, page.path),
      source: "branded",
      alt: `${site.brand.name} — ${page.title}`,
    };
  }

  const aiEnhanced = await tryAiEnhancement(request, text, page, settings);
  const finalText = aiEnhanced ?? text;

  return {
    text: finalText,
    hashtags,
    cta: `${site.domain}${page.path === "/" ? "" : page.path}`,
    platform,
    contentType,
    image,
    insights: buildInsights(site, page, image.source, platform, settings),
    sourcePage: page.path,
    characterCount: finalText.length,
    createdAt: new Date().toISOString(),
  };
}

export async function generateCampaignPack(
  request: BatchGenerateRequest,
): Promise<SavedPost[]> {
  const {
    site,
    settings,
    prompt = "",
    platforms = settings?.defaultPlatforms ?? DEFAULT_SETTINGS.defaultPlatforms,
    maxPosts = 9,
  } = request;

  const posts: SavedPost[] = [];
  const pages = site.pages.slice(0, Math.ceil(maxPosts / platforms.length));

  for (const page of pages) {
    for (const platform of platforms) {
      if (posts.length >= maxPosts) break;

      const post = await generateSmartPost({
        site,
        contentType: "Social Post",
        platform,
        prompt,
        sourcePageUrl: page.url,
        settings,
      });

      const dayOffset = posts.length;
      const scheduled = new Date();
      scheduled.setDate(scheduled.getDate() + dayOffset);

      posts.push({
        ...post,
        id: `${Date.now()}-${posts.length}`,
        createdAt: new Date().toISOString(),
        scheduledFor: scheduled.toISOString().split("T")[0],
      });
    }
  }

  return posts;
}

async function tryAiEnhancement(
  request: GenerateRequest,
  draft: string,
  page: SitePage,
  settings: UserSettings,
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.XAI_API_KEY
    ? "https://api.x.ai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  const model = process.env.XAI_API_KEY ? "grok-3-mini" : "gpt-4o-mini";
  const tone = settings.brandVoice || request.site.brand.tone;

  const systemPrompt = `You are an expert marketing copywriter. Rewrite the draft to be compelling and on-brand for ${request.platform}. Brand: ${request.site.brand.name}. Voice: ${tone}. Audience: ${settings.targetAudience}. Return only the final copy.`;

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Page: ${page.title}\nDraft:\n${draft}${request.prompt ? `\nFocus: ${request.prompt}` : ""}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}