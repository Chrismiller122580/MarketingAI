import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { VoiceSettings } from "@elevenlabs/elevenlabs-js/api/types/VoiceSettings";
import { uploadToBlob } from "@/lib/blob-storage";
import { TALK_VOICE_SETTINGS } from "@/lib/viraforge/talk-settings";

/** Rachel — widely available default; override with ELEVENLABS_VOICE_ID */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128" as const;

export function hasVoiceProvider(): boolean {
  return !!process.env.ELEVENLABS_API_KEY?.trim();
}

export function getDefaultVoiceId(): string {
  const configured = process.env.ELEVENLABS_VOICE_ID?.trim();
  // Voice IDs look like "21m00Tcm4TlvDq8ikWAM" — not sk_* API keys
  if (configured && !configured.startsWith("sk_")) {
    return configured;
  }
  return DEFAULT_VOICE_ID;
}

/** Trim caption to a short spoken script that fits video length. */
export function buildVoiceoverScript(caption: string, durationSec = 5): string {
  const maxWords = durationSec <= 5 ? 15 : 28;
  const firstBlock = caption.split(/\n\n+/)[0] ?? caption;
  const cleaned = firstBlock
    .replace(/#[\w\u00C0-\u024F]+/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/→\s*\S+/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const words = cleaned.split(" ").filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(merged);
}

export type SpeechSynthesisOptions = {
  voiceId?: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
  purpose?: "talk" | "default";
};

/** Estimate MP3 duration for ElevenLabs mp3_44100_128 output. */
export function estimateMp3DurationSec(buffer: Buffer): number {
  const bitrateKbps = 128;
  const duration = (buffer.length * 8) / (bitrateKbps * 1000);
  return Math.round(duration * 10) / 10;
}

export async function synthesizeSpeech(
  text: string,
  options?: SpeechSynthesisOptions,
): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey || !text.trim()) return null;

  const voiceSettings =
    options?.voiceSettings ??
    (options?.purpose === "talk" ? TALK_VOICE_SETTINGS : undefined);

  try {
    const client = new ElevenLabsClient({ apiKey });
    const audioStream = await client.textToSpeech.convert(
      options?.voiceId ?? getDefaultVoiceId(),
      {
        text: text.trim(),
        modelId: options?.modelId ?? DEFAULT_MODEL_ID,
        outputFormat: DEFAULT_OUTPUT_FORMAT,
        ...(voiceSettings ? { voiceSettings } : {}),
      },
    );

    return await streamToBuffer(audioStream);
  } catch {
    return null;
  }
}

export async function synthesizeSpeechWithMeta(
  text: string,
  options?: SpeechSynthesisOptions,
): Promise<{ buffer: Buffer; durationSec: number; voiceId: string } | null> {
  const buffer = await synthesizeSpeech(text, options);
  if (!buffer) return null;

  return {
    buffer,
    durationSec: estimateMp3DurationSec(buffer),
    voiceId: options?.voiceId ?? getDefaultVoiceId(),
  };
}

export async function uploadVoiceover(
  buffer: Buffer,
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const filename = `voiceovers/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
    return await uploadToBlob(filename, buffer, "audio/mpeg");
  } catch {
    return null;
  }
}

export async function synthesizeSpeechDataUrl(
  text: string,
  options?: SpeechSynthesisOptions,
): Promise<{
  audioDataUrl: string;
  voiceId: string;
  durationSec: number;
} | null> {
  const result = await synthesizeSpeechWithMeta(text, options);
  if (!result) return null;

  return {
    audioDataUrl: `data:audio/mpeg;base64,${result.buffer.toString("base64")}`,
    voiceId: result.voiceId,
    durationSec: result.durationSec,
  };
}

export async function generateVoiceoverAudio(
  caption: string,
  durationSec = 5,
  voiceId?: string,
): Promise<{ audioUrl: string; script: string; voiceId: string } | null> {
  const script = buildVoiceoverScript(caption, durationSec);
  if (!script) return null;

  const buffer = await synthesizeSpeech(script, { voiceId });
  if (!buffer) return null;

  const audioUrl = await uploadVoiceover(buffer);
  if (!audioUrl) return null;

  return { audioUrl, script, voiceId: voiceId ?? getDefaultVoiceId() };
}