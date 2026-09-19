import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { InfluencerMotionType } from "./influencer-assets";

type SilentMotionType = Exclude<InfluencerMotionType, "talk" | "walk-talk">;

function subjectLabel(persona: CreatorAvatarForm): string {
  return persona.gender === "female"
    ? "woman"
    : persona.gender === "male"
      ? "man"
      : "person";
}

export function buildTalkCloseupPrompt(persona: CreatorAvatarForm): string {
  const subject = subjectLabel(persona);

  return [
    `Photorealistic ${subject}, age ${persona.age}, talking to camera in a studio close-up.`,
    `Wardrobe: ${persona.wardrobe}`,
    `Mood: ${persona.personalityVoice.slice(0, 120)}.`,
    "Tight head-and-shoulders framing, eyes on lens, natural blinks.",
    "Continuously speaking: jaw drops on vowels, lips close on M/B/P, teeth briefly visible, not a frozen smile.",
    "Subtle head nods and micro-expressions, no walking, no spinning, no looking away.",
    "Maintain consistent face from the reference portrait.",
    "Soft key light, shallow bokeh, no text, no watermarks, no subtitles.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildWalkTalkPrompt(persona: CreatorAvatarForm): string {
  const subject = subjectLabel(persona);
  const city = persona.location.split("+")[0]?.trim() || persona.location;
  const hood = persona.neighborhoods?.trim();

  return [
    `Photorealistic ${subject}, age ${persona.age}, walking through ${city}.`,
    hood ? `Neighborhood streets and landmarks that feel like ${hood}.` : "",
    `Wardrobe: ${persona.wardrobe}`,
    `Mood: ${persona.personalityVoice.slice(0, 120)}.`,
    "Medium shot, waist-up to mid-thigh, not a tight face close-up.",
    "Handheld vlog camera tracking beside them as they walk a city sidewalk.",
    "Natural arm swing, confident pace, looking toward camera while talking.",
    "Mouth opening and closing mid-sentence so later lip-sync has a usable talking mouth, not a closed smile.",
    "Maintain consistent face and body from the reference portrait.",
    "Natural daylight, cinematic, shallow street bokeh, no text, no watermarks.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildMotionPrompt(
  persona: CreatorAvatarForm,
  motionType: SilentMotionType,
): string {
  const subject = subjectLabel(persona);

  const base = [
    `Photorealistic ${subject}, age ${persona.age}, ${persona.location}.`,
    `Wardrobe: ${persona.wardrobe}`,
    `Mood: ${persona.personalityVoice.slice(0, 120)}.`,
    "Maintain consistent face and body from the reference portrait.",
    "Natural lighting, cinematic, no text overlays, no watermarks.",
  ];

  const motion: Record<SilentMotionType, string> = {
    walk: "Walking forward confidently with natural arm swing, steady camera tracking, full upper-body in frame.",
    spin: "Smooth 360-degree spin with hair movement, playful energy, camera holds center framing.",
    jump: "Energetic jump with soft landing, dynamic motion, fitness influencer energy.",
    wave: "Friendly wave hello to camera with warm smile, subtle upper-body movement, inviting social energy.",
    point: "Pointing toward camera with confident gesture, as if highlighting a product or CTA, engaging eye contact.",
  };

  return [...base, motion[motionType]].join(" ");
}
