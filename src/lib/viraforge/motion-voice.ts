import { getDefaultVoiceId } from "@/lib/ai-voice";

/** Premade ElevenLabs voices. Rachel is the old account default and reads as a woman. */
const RACHEL = "21m00Tcm4TlvDq8ikWAM";
const ADAM = "pNInz6obpgDQGcFmaJgB";
const CHARLIE = "IKne3meq5aSn9XLyUdCD";

const STOCK_VOICES = new Set([RACHEL, ADAM, CHARLIE]);

export type AvatarVoiceGender = "female" | "male" | "nonbinary";

/** Use only values that look like ElevenLabs voice IDs, not URLs or API keys. */
export function resolveMotionVoiceId(voiceId?: string): string | undefined {
  if (!voiceId) return undefined;
  const trimmed = voiceId.trim();
  if (
    trimmed.startsWith("sk_") ||
    trimmed.startsWith("http") ||
    trimmed.startsWith("/") ||
    trimmed.includes("/")
  ) {
    return undefined;
  }
  if (!/^[\w-]{10,40}$/.test(trimmed)) return undefined;
  return trimmed;
}

function voiceForGender(gender: AvatarVoiceGender | undefined): string {
  if (gender === "male") return ADAM;
  if (gender === "nonbinary") return CHARLIE;
  const account = getDefaultVoiceId();
  if (account === ADAM || account === CHARLIE) return RACHEL;
  return account;
}

/**
 * A stored voice is kept only when it was chosen for this avatar.
 * The account default and the stock voices are matched to gender instead,
 * so a man does not keep a woman's voice from an earlier clip.
 */
export function voiceIdForAvatar(
  gender: AvatarVoiceGender | undefined,
  stored?: string,
): string {
  const personal = resolveMotionVoiceId(stored);
  const account = getDefaultVoiceId();
  if (personal && !STOCK_VOICES.has(personal) && personal !== account) {
    return personal;
  }
  return voiceForGender(gender);
}
