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
    "Clearly talking the whole time: jaw, lips, and cheeks move with each word, small nods, one hand gesture into frame.",
    "Alive and in motion, never a frozen photo. No walking away, no spin.",
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
    "Medium shot, waist-up, camera tracking beside them as they walk.",
    "They take several clear steps down the sidewalk. Arms swing. Hair and clothes shift. The background moves past.",
    "They look toward the camera and talk while walking. Mouth opens and closes. Not a still portrait.",
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
    walk: "They walk several steps toward and past the camera, full arm swing, background sliding by. Clearly moving, not a still photo.",
    spin: "A full smooth turn in place, hair and clothes moving, camera stays centered.",
    jump: "A real jump off the ground and a soft landing, body in motion the whole clip.",
    wave: "They raise a hand and wave at the camera, smiling, upper body moving.",
    point: "They point toward the camera like they are showing a product, then a small step closer.",
  };

  return [...base, motion[motionType]].join(" ");
}
