export const VIDEO_LOOKS = [
  {
    id: "influencer",
    label: "Influencer",
    detail: "Warm filter, emojis, and a pop-up",
  },
  {
    id: "promo",
    label: "Promo",
    detail: "Bold grade and a call-to-action card",
  },
  {
    id: "street",
    label: "Street",
    detail: "Cool grade and a place sticker",
  },
  {
    id: "clean",
    label: "Clean",
    detail: "Avatar and voice only",
  },
] as const;

export type VideoLookId = (typeof VIDEO_LOOKS)[number]["id"];

export function normalizeVideoLook(value: unknown): VideoLookId {
  if (typeof value !== "string") return "clean";
  const match = VIDEO_LOOKS.find((look) => look.id === value);
  return match?.id ?? "clean";
}

export function popupLineFromScript(script?: string): string {
  const cleaned = (script ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[#@][\w]+/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Watch this";
  let line = cleaned.split(" ").slice(0, 5).join(" ");
  if (line.length > 26) line = line.slice(0, 26).trim();
  return line;
}
