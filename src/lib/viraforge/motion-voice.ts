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