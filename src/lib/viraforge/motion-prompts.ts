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
    "Tight head-and-shoulders framing, eyes on lens, natural blinks.",
    "Mouth is speaking, not a posed smile. Lips form words. Teeth are not locked in a grin.",
    "Alive and in motion, never a frozen photo. No walking away, no spin.",
    "Maintain consistent face from the reference portrait.",
    "Soft key light, shallow bokeh. Empty background.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildWalkTalkPrompt(persona: CreatorAvatarForm): string {
  const subject = subjectLabel(persona);
  const city = persona.location.split("+")[0]?.trim() || persona.location;
  const hood = persona.neighborhoods?.trim();

  return [
    `Photorealistic ${subject}, age ${persona.age}, standing on a street in ${city}.`,
    hood ? `The street behind them feels like ${hood}.` : "",
    `Wardrobe: ${persona.wardrobe}`,
    "Locked close-up for the entire clip. Head and shoulders only. The face fills most of the frame.",
    "The camera does not zoom out. The legs are never shown. They do not walk away.",
    "Eyes stay on the lens. The mouth is working the whole time, forming words, not holding a smile.",
    "A little sway is fine. The background can move slightly. The face stays large and front-on.",
    "Maintain consistent face and body from the reference portrait.",
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
