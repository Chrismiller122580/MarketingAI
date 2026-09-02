/** User-facing copy. Never mention env vars, API keys, or admin setup. */

export const PUBLIC_ERRORS = {
  imageUnavailable:
    "AI images aren't available right now. Use a photo from your site, or try again later.",
  videoUnavailable:
    "Video isn't available right now. Publish an image post, or try again later.",
  voiceUnavailable:
    "Voiceover isn't available right now. The clip will still generate without it.",
  copyUnavailable:
    "We couldn't write that just now. Try again in a moment.",
  videoFailed: "Video didn't finish. Try again, or publish the image version.",
  motionUnavailable:
    "Motion clips aren't available right now. Try a still portrait instead.",
} as const;
