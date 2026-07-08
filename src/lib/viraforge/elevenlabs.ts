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
      "ElevenLabs is not configured. Add ELEVENLABS_API_KEY to enable talking clips.",
    );
  }

  const result = await synthesizeSpeechDataUrl(script.trim(), {
    voiceId: options?.voiceId,
    purpose: options?.purpose ?? "talk",
  });

  if (!result) {
    throw new Error(
      "ElevenLabs synthesis failed. Check ELEVENLABS_API_KEY and voice ID.",
    );
  }

  return result;
}