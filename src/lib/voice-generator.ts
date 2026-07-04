import {
  generateVoiceoverAudio,
  hasVoiceProvider,
} from "./ai-voice";

export async function startVoiceoverGeneration(
  caption: string,
  durationSec: 5 | 10 = 5,
): Promise<
  | { audioUrl: string; script: string }
  | { error: string }
  | null
> {
  if (!hasVoiceProvider()) return null;

  const result = await generateVoiceoverAudio(caption, durationSec);
  if (result) return result;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      error:
        "Voiceover generated but BLOB_READ_WRITE_TOKEN is missing — add Vercel Blob to store audio.",
    };
  }

  return { error: "Failed to generate voiceover. Check ELEVENLABS_API_KEY." };
}