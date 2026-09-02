import {
  getDefaultVoiceId,
  hasVoiceProvider,
  synthesizeSpeechDataUrl,
} from "@/lib/ai-voice";

export function hasElevenLabs(): boolean {
  return hasVoiceProvider();
}

export function getElevenLabsVoiceId(): string {
  return getDefaultVoiceId();
}

export async function synthesizeSpeech(
  script: string,
  options?: { voiceId?: string; purpose?: "talk" | "default" },
): Promise<{
  audioDataUrl: string;
  voiceId: string;
  durationSec: number;
}> {
  if (!hasVoiceProvider()) {
    throw new Error(
      "Voice isn't available right now. The clip can still generate without it.",
    );
  }

  const result = await synthesizeSpeechDataUrl(script.trim(), {
    voiceId: options?.voiceId,
    purpose: options?.purpose ?? "talk",
  });

  if (!result) {
    throw new Error(
      "Voice synthesis failed. Try again in a moment.",
    );
  }

  return result;
}