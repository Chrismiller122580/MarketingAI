import type { CreatorAvatarForm } from "@/lib/schemas/creator-avatar-schema";
import type { InfluencerMotionType } from "./influencer-assets";

export function buildMotionPrompt(
  persona: CreatorAvatarForm,
  motionType: Exclude<InfluencerMotionType, "talk">,
): string {
  const subject =
    persona.gender === "female"
      ? "woman"
      : persona.gender === "male"
        ? "man"
        : "person";

  const base = [
    `Photorealistic ${subject}, age ${persona.age}, ${persona.location}.`,
    `Wardrobe: ${persona.wardrobe}`,
    `Mood: ${persona.personalityVoice.slice(0, 120)}.`,
    "Maintain consistent face and body from the reference portrait.",
    "Natural lighting, cinematic, no text overlays, no watermarks.",
  ];

  const motion: Record<Exclude<InfluencerMotionType, "talk">, string> = {
    walk: "Walking forward confidently with natural arm swing, steady camera tracking, full upper-body in frame.",
    spin: "Smooth 360-degree spin with hair movement, playful energy, camera holds center framing.",
    jump: "Energetic jump with soft landing, dynamic motion, fitness influencer energy.",
    wave: "Friendly wave hello to camera with warm smile, subtle upper-body movement, inviting social energy.",
    point: "Pointing toward camera with confident gesture, as if highlighting a product or CTA, engaging eye contact.",
  };

  return [...base, motion[motionType]].join(" ");
}