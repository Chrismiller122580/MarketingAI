import type {
  GeneratedPost,
  ImageOverlayLayer,
  ImageOverlayShapeLayer,
  ImageOverlayTextLayer,
} from "./types";

export const FONT_OPTIONS = [
  { id: "sans", label: "Modern", value: "system-ui, -apple-system, sans-serif" },
  { id: "serif", label: "Editorial", value: "Georgia, 'Times New Roman', serif" },
  { id: "display", label: "Bold display", value: "'Arial Black', 'Helvetica Neue', sans-serif" },
  { id: "mono", label: "Tech", value: "ui-monospace, 'SF Mono', monospace" },
] as const;

function uid() {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function brandColor(themeColor: string) {
  return themeColor.startsWith("#") ? themeColor : `#${themeColor}`;
}

export function presetHeadline(
  post: GeneratedPost,
  brandName: string,
  canvasW: number,
  canvasH: number,
): ImageOverlayTextLayer {
  return {
    type: "text",
    id: uid(),
    text: post.text.split("\n")[0]?.slice(0, 72) || brandName,
    x: 48,
    y: canvasH * 0.12,
    fontSize: canvasW > 1000 ? 56 : 40,
    color: "#ffffff",
    fontFamily: FONT_OPTIONS[0].value,
    fontStyle: "bold",
    width: canvasW - 96,
    align: "left",
    shadowColor: "#000000",
    shadowBlur: 8,
    shadowOpacity: 0.65,
  };
}

export function presetSubtitle(
  post: GeneratedPost,
  canvasW: number,
  canvasH: number,
): ImageOverlayTextLayer {
  const line = post.text.split("\n").slice(1).join(" ").slice(0, 120);
  return {
    type: "text",
    id: uid(),
    text: line || "Add your supporting message here",
    x: 48,
    y: canvasH * 0.28,
    fontSize: canvasW > 1000 ? 28 : 22,
    color: "#f8fafc",
    fontFamily: FONT_OPTIONS[0].value,
    width: canvasW - 96,
    align: "left",
    shadowColor: "#000000",
    shadowBlur: 4,
    shadowOpacity: 0.5,
  };
}

export function presetBottomBar(canvasW: number, canvasH: number): ImageOverlayShapeLayer {
  const h = Math.round(canvasH * 0.32);
  return {
    type: "shape",
    id: uid(),
    shape: "rect",
    x: 0,
    y: canvasH - h,
    width: canvasW,
    height: h,
    fill: "#000000",
    opacity: 0.45,
    cornerRadius: 0,
  };
}

export function presetCtaPill(
  post: GeneratedPost,
  themeColor: string,
  canvasW: number,
  canvasH: number,
): ImageOverlayLayer[] {
  const color = brandColor(themeColor);
  const label = post.cta?.replace(/^→\s*/, "").slice(0, 36) || "Learn more";
  const pillW = Math.min(320, canvasW - 96);
  const pillH = 56;
  const x = 48;
  const y = canvasH - pillH - 48;

  const pill: ImageOverlayShapeLayer = {
    type: "shape",
    id: uid(),
    shape: "pill",
    x,
    y,
    width: pillW,
    height: pillH,
    fill: color,
    opacity: 1,
    cornerRadius: pillH / 2,
  };

  const text: ImageOverlayTextLayer = {
    type: "text",
    id: uid(),
    text: label,
    x: x + 24,
    y: y + 14,
    fontSize: 22,
    color: "#ffffff",
    fontFamily: FONT_OPTIONS[0].value,
    fontStyle: "bold",
    width: pillW - 48,
    align: "center",
  };

  return [pill, text];
}

export function presetBrandTag(
  brandName: string,
  themeColor: string,
  canvasW: number,
): ImageOverlayLayer[] {
  const color = brandColor(themeColor);
  const tagW = Math.min(220, canvasW * 0.35);
  const tagH = 40;
  const x = canvasW - tagW - 32;
  const y = 32;

  return [
    {
      type: "shape",
      id: uid(),
      shape: "pill",
      x,
      y,
      width: tagW,
      height: tagH,
      fill: color,
      opacity: 0.92,
      cornerRadius: tagH / 2,
    },
    {
      type: "text",
      id: uid(),
      text: brandName.slice(0, 24),
      x: x + 16,
      y: y + 9,
      fontSize: 16,
      color: "#ffffff",
      fontFamily: FONT_OPTIONS[0].value,
      fontStyle: "bold",
      width: tagW - 32,
      align: "center",
    },
  ];
}

export function defaultEditorLayers(
  post: GeneratedPost,
  brandName: string,
  themeColor: string,
  canvasW: number,
  canvasH: number,
): ImageOverlayLayer[] {
  return [
    presetBottomBar(canvasW, canvasH),
    presetHeadline(post, brandName, canvasW, canvasH),
    ...presetCtaPill(post, themeColor, canvasW, canvasH),
  ];
}