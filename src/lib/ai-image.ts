import { isVerticalContentType } from "./content-formats";
import type { ContentType, Platform, SiteData, SitePage } from "./types";
import {
  enrichVisualPrompt,
  type VisualTargeting,
} from "./visual-targeting";

/** gpt-image-1 supported sizes (dall-e-3 sizes like 1792x1024 are invalid). */
const OPENAI_SIZES: Record<Platform, "1024x1024" | "1536x1024" | "1024x1536"> = {
  instagram: "1024x1024",
  twitter: "1536x1024",
  linkedin: "1536x1024",
  facebook: "1536x1024",
  pinterest: "1024x1536",
  email: "1536x1024",
};

const XAI_ASPECT_RATIOS: Record<Platform, string> = {
  instagram: "1:1",
  twitter: "16:9",
  linkedin: "16:9",
  facebook: "16:9",
  pinterest: "9:16",
  email: "16:9",
};

const DEFAULT_OPENAI_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

function buildImagePrompt(
  site: SiteData,
  page: SitePage,
  platform: Platform,
  contentType?: ContentType,
): string {
  const keywords = site.brand.keywords.slice(0, 5).join(", ");
  const formatHint =
    contentType === "Story"
      ? "Vertical Instagram Story — bold, immersive full-screen creative with space for text overlays at top and bottom."
      : `Style: modern, clean, high-quality social media creative for ${platform}.`;

  return [
    `Professional marketing visual for ${site.brand.name}.`,
    `Topic: ${page.title}.`,
    page.description ? `Context: ${page.description.slice(0, 120)}.` : "",
    `Brand tone: ${site.brand.tone}.`,
    `Keywords: ${keywords}.`,
    formatHint,
    "No text overlays, no watermarks, no logos.",
    "Photorealistic or polished illustration suitable for a brand campaign.",
  ]
    .filter(Boolean)
    .join(" ");
}

function resolveImageSize(
  platform: Platform,
  contentType?: ContentType,
): (typeof OPENAI_SIZES)[Platform] {
  if (contentType && isVerticalContentType(contentType)) {
    return "1024x1536";
  }
  return OPENAI_SIZES[platform];
}

function resolveXaiAspect(
  platform: Platform,
  contentType?: ContentType,
): string {
  if (contentType && isVerticalContentType(contentType)) {
    return "9:16";
  }
  return XAI_ASPECT_RATIOS[platform];
}

function parseOpenAiImage(data: {
  data?: Array<{ url?: string; b64_json?: string }>;
}): string | null {
  const item = data.data?.[0];
  if (!item) return null;
  if (item.url) return item.url;
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  return null;
}

async function generateOpenAiImage(
  prompt: string,
  size: (typeof OPENAI_SIZES)[Platform],
): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) return null;

  try {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: DEFAULT_OPENAI_IMAGE_MODEL,
          prompt,
          n: 1,
          size,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "OpenAI image generation failed:",
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();
    return parseOpenAiImage(data);
  } catch (err) {
    console.error("OpenAI image generation error:", err);
    return null;
  }
}

async function generateXaiImage(
  prompt: string,
  platform: Platform,
  contentType?: ContentType,
): Promise<string | null> {
  const xaiKey = process.env.XAI_API_KEY?.trim();
  if (!xaiKey) return null;

  try {
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-image-quality",
        prompt,
        n: 1,
        aspect_ratio: resolveXaiAspect(platform, contentType),
      }),
    });

    if (!response.ok) {
      console.error(
        "xAI image generation failed:",
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();
    const item = data.data?.[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return null;
  } catch (err) {
    console.error("xAI image generation error:", err);
    return null;
  }
}

export async function generateAiImage(
  site: SiteData,
  page: SitePage,
  platform: Platform,
  visualTargeting?: VisualTargeting,
  contentType?: ContentType,
): Promise<{ url: string; prompt: string; provider: "openai" | "xai" } | null> {
  const prompt = enrichVisualPrompt(
    buildImagePrompt(site, page, platform, contentType),
    visualTargeting,
    "image",
  );
  const size = resolveImageSize(platform, contentType);

  return generateImageFromPrompt(prompt, { size, platform, contentType });
}

export async function generateImageFromPrompt(
  prompt: string,
  options?: {
    size?: (typeof OPENAI_SIZES)[Platform];
    platform?: Platform;
    contentType?: ContentType;
  },
): Promise<{ url: string; prompt: string; provider: "openai" | "xai" } | null> {
  const platform = options?.platform ?? "instagram";
  const size = options?.size ?? resolveImageSize(platform, options?.contentType);

  const openaiUrl = await generateOpenAiImage(prompt, size);
  if (openaiUrl) {
    return { url: openaiUrl, prompt, provider: "openai" };
  }

  const xaiUrl = await generateXaiImage(prompt, platform, options?.contentType);
  if (xaiUrl) {
    return { url: xaiUrl, prompt, provider: "xai" };
  }

  return null;
}