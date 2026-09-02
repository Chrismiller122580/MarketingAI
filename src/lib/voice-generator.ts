import {
  generateVoiceoverAudio,
  hasVoiceProvider,
} from "./ai-voice";

export async function startVoiceoverGeneration(
  caption: string,
  durationSec: 5 | 10 = 5,
  voiceId?: string,
): Promise<
  | { audioUrl: string; script: string; voiceId?: string }
  | { error: string }
  | null
> {
  if (!hasVoiceProvider()) return null;

  const result = await generateVoiceoverAudio(caption, durationSec, voiceId);
  if (result) {
    return {
      audioUrl: result.audioUrl,
      script: result.script,
      voiceId: result.voiceId,
    };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      error:
        "Voiceover generated but BLOB_READ_WRITE_TOKEN is missing — add Vercel Blob to store audio.",
    };
  }

  return { error: "Failed to generate voiceover. The post can still publish without it." };
}