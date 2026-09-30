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
    "Soft key light, shallow bokeh. Empty background. No writing, no signs, no cards, no logos, no captions.",
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
    "Medium-close shot, chest up, walking a few steps toward the camera.",
    "Face stays large in frame and locked on the lens the whole clip. Both eyes visible. Mouth easy to read.",
    "They speak the entire time they walk. Jaw and lips move on every word. Not a profile, not a glance away.",
    "Arms swing, hair and clothes shift, the background moves past. Not a still portrait.",
    "Maintain consistent face and body from the reference portrait.",
    "Clean frame only. No writing, no signs, no cards, no logos, no captions anywhere in the shot.",
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
    walk: "Full-body shot from behind and to the side as they walk away down the street for several steps. Mouth closed. Not talking. No close-up. No graphics.",
    spin: "They stand in an empty spot and do one full turn in place. Camera stays centered. Not walking down a street. No graphics.",
    jump: "They crouch and jump straight up, then land. The whole body leaves the ground. Not a walking shot. No graphics.",
    wave: "They stop, face the camera, and wave with one raised hand. Feet stay planted. Not a walking ad. No graphics.",
    point: "They point straight at the lens, then take one step closer. Upper body only. Not a street walk. No graphics.",
  };

  return [...base, motion[motionType], "Clean frame. No writing, signs, cards, logos, or captions."].join(" ");
}
