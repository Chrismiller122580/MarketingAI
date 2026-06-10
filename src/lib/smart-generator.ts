import { pickBestImage, buildBrandedImageUrl } from "./image-matcher";
import type {
  ContentType,
  GeneratedPost,
  GenerateRequest,
  Platform,
  SiteData,
  SitePage,
} from "./types";

const PLATFORM_LIMITS: Record<Platform, number> = {
  twitter: 280,
  instagram: 2200,
  linkedin: 3000,
  facebook: 5000,
  pinterest: 500,
};

function pickPage(site: SiteData, sourcePageUrl?: string): SitePage {
  if (sourcePageUrl) {
    return site.pages.find((p) => p.url === sourcePageUrl) ?? site.pages[0];
  }
  return site.pages.find((p) => p.path === "/") ?? site.pages[0];
}

function buildHashtags(site: SiteData, page: SitePage, prompt: string): string[] {
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
): string {
  const h = hook(page, site.brand);
  const body = page.description || page.excerpt.slice(0, 200);
  const cta = `→ ${site.domain}${page.path === "/" ? "" : page.path}`;
  const emoji = platform === "linkedin" ? "" : "✨ ";

  let post = `${emoji}${h}\n\n${body}`;
  if (prompt) post += `\n\n💡 ${prompt}`;
  post += `\n\n${cta}`;

  const hashtags = buildHashtags(site, page, prompt);
  const tagLine = hashtags.join(" ");
  const withTags = `${post}\n\n${tagLine}`;

  return truncate(withTags, PLATFORM_LIMITS[platform]);
}

function emailCopy(site: SiteData, page: SitePage, prompt: string): string {
  const highlights = site.pages
    .slice(0, 4)
    .map((p) => `• ${p.title}: ${p.description || p.excerpt.slice(0, 100)}`)
    .join("\n");

  return truncate(
    `Subject: ${hook(page, site.brand)} — ${site.brand.name}\n\nHi there,\n\n${page.description || page.excerpt}\n\nHighlights from our site:\n${highlights}${prompt ? `\n\nFocus: ${prompt}` : ""}\n\nExplore more at ${site.domain}`,
    4000,
  );
}

function adHeadline(site: SiteData, page: SitePage): string {
  return truncate(`${hook(page, site.brand)} | ${site.brand.name}`, 90);
}

function blogIntro(site: SiteData, page: SitePage, prompt: string): string {
  const topics = site.brand.topics.slice(0, 4).join(", ");
  return truncate(
    `${page.description || page.excerpt}\n\nAt ${site.brand.name}, we explore ${topics || "what matters most to our audience"}.${prompt ? ` This article focuses on ${prompt}.` : ""} Read the full story at ${site.domain}${page.path}.`,
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
  (site: SiteData, page: SitePage, platform: Platform, prompt: string) => string
> = {
  "Social Post": socialPost,
  "Email Copy": emailCopy,
  "Ad Headline": adHeadline,
  "Blog Intro": blogIntro,
  "Product Description": productDescription,
};

function buildInsights(
  site: SiteData,
  page: SitePage,
  imageSource: GeneratedPost["image"]["source"],
  platform: Platform,
): string[] {
  const insights = [
    `Matched content from "${page.title}" (${page.path}) based on site structure.`,
    `Brand tone detected: ${site.brand.tone}.`,
    `Top keywords: ${site.brand.keywords.slice(0, 5).join(", ")}.`,
  ];

  if (imageSource === "site") {
    insights.push("Selected the highest-scoring image from crawled site pages.");
  } else {
    insights.push(
      "No suitable site image found — generated a branded visual using your site identity.",
    );
  }

  insights.push(
    `Optimized for ${platform} (${PLATFORM_LIMITS[platform]} char limit).`,
  );

  return insights;
}

export async function generateSmartPost(
  request: GenerateRequest,
): Promise<GeneratedPost> {
  const { site, contentType, platform, prompt = "", sourcePageUrl } = request;
  const page = pickPage(site, sourcePageUrl);
  const generate = generators[contentType];
  const text = generate(site, page, platform, prompt);
  const hashtags = buildHashtags(site, page, prompt);

  const context = `${page.title} ${page.description} ${prompt}`;
  const siteImage = pickBestImage(site, context, page, platform);

  let image: GeneratedPost["image"];
  if (siteImage) {
    const proxyUrl = `/api/image?url=${encodeURIComponent(siteImage.url)}`;
    image = {
      url: proxyUrl,
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

  const aiEnhanced = await tryAiEnhancement(request, text, page);
  const finalText = aiEnhanced ?? text;

  return {
    text: finalText,
    hashtags,
    cta: `${site.domain}${page.path === "/" ? "" : page.path}`,
    platform,
    contentType,
    image,
    insights: buildInsights(site, page, image.source, platform),
    sourcePage: page.path,
    characterCount: finalText.length,
  };
}

async function tryAiEnhancement(
  request: GenerateRequest,
  draft: string,
  page: SitePage,
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.XAI_API_KEY
    ? "https://api.x.ai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  const model = process.env.XAI_API_KEY ? "grok-3-mini" : "gpt-4o-mini";

  const systemPrompt = `You are an expert marketing copywriter. Rewrite the draft post to be compelling, on-brand, and optimized for ${request.platform}. Brand: ${request.site.brand.name}. Tone: ${request.site.brand.tone}. Keep hashtags if present. Return only the final copy, no explanation.`;

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
            content: `Page: ${page.title}\nDescription: ${page.description}\nDraft:\n${draft}${request.prompt ? `\nExtra focus: ${request.prompt}` : ""}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}