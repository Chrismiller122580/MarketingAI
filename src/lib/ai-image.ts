import type { Platform, SiteData, SitePage } from "./types";

const OPENAI_SIZES: Record<Platform, "1024x1024" | "1792x1024" | "1024x1792"> = {
  instagram: "1024x1024",
  twitter: "1792x1024",
  linkedin: "1792x1024",
  facebook: "1792x1024",
  pinterest: "1024x1792",
  email: "1792x1024",
};

const XAI_ASPECT_RATIOS: Record<Platform, string> = {
  instagram: "1:1",
  twitter: "16:9",
  linkedin: "16:9",
  facebook: "16:9",
  pinterest: "9:16",
  email: "16:9",
};

function buildImagePrompt(
  site: SiteData,
  page: SitePage,
  platform: Platform,
): string {
  const keywords = site.brand.keywords.slice(0, 5).join(", ");
  return [
    `Professional marketing visual for ${site.brand.name}.`,
    `Topic: ${page.title}.`,
    page.description ? `Context: ${page.description.slice(0, 120)}.` : "",
    `Brand tone: ${site.brand.tone}.`,
    `Keywords: ${keywords}.`,
    `Style: modern, clean, high-quality social media creative for ${platform}.`,
    "No text overlays, no watermarks, no logos.",
    "Photorealistic or polished illustration suitable for a brand campaign.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateAiImage(
  site: SiteData,
  page: SitePage,
  platform: Platform,
): Promise<{ url: string; prompt: string } | null> {
  const prompt = buildImagePrompt(site, page, platform);
  const size = OPENAI_SIZES[platform];

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
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
            model: "dall-e-3",
            prompt,
            n: 1,
            size,
            quality: "standard",
          }),
        },
      );

      if (!response.ok) return null;
      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) return null;

      return { url: imageUrl, prompt };
    } catch {
      return null;
    }
  }

  const xaiKey = process.env.XAI_API_KEY;
  if (xaiKey) {
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
          aspect_ratio: XAI_ASPECT_RATIOS[platform],
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const item = data.data?.[0];
      const imageUrl = item?.url;
      if (imageUrl) return { url: imageUrl, prompt };

      const b64 = item?.b64_json;
      if (b64) {
        return { url: `data:image/png;base64,${b64}`, prompt };
      }

      return null;
    } catch {
      return null;
    }
  }

  return null;
}