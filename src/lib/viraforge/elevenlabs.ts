const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export function hasElevenLabs(): boolean {
  return !!process.env.ELEVENLABS_API_KEY?.trim();
}

export function getElevenLabsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
}

export async function synthesizeSpeech(script: string): Promise<{
  audioDataUrl: string;
  voiceId: string;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ElevenLabs is not configured. Add ELEVENLABS_API_KEY to enable talking clips.",
    );
  }

  const voiceId = getElevenLabsVoiceId();
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.35,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `ElevenLabs failed (${response.status}): ${detail.slice(0, 180)}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const audioDataUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;

  return { audioDataUrl, voiceId };
}