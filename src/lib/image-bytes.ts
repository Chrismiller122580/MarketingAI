export type DetectedImageFormat = {
  mime: string;
  ext: string;
};

const MIN_IMAGE_BYTES = 64;

export function detectImageFormat(bytes: Buffer): DetectedImageFormat | null {
  if (bytes.length < MIN_IMAGE_BYTES) return null;

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  if (
    bytes.toString("ascii", 0, 3) === "GIF" &&
    (bytes.toString("ascii", 3, 6) === "87a" ||
      bytes.toString("ascii", 3, 6) === "89a")
  ) {
    return { mime: "image/gif", ext: "gif" };
  }

  return null;
}

export function assertValidImageBytes(
  bytes: Buffer,
  label: string,
): DetectedImageFormat {
  const detected = detectImageFormat(bytes);
  if (detected) return detected;

  const preview = bytes
    .subarray(0, 48)
    .toString("utf8")
    .replace(/[^\x20-\x7e]/g, ".");
  const looksHtml = /^\s*</.test(preview) || preview.includes("<!DOCTYPE");
  const looksJson = preview.trimStart().startsWith("{");

  if (looksHtml || looksJson) {
    throw new Error(
      `${label} URL returned ${looksHtml ? "HTML" : "JSON"} instead of image data`,
    );
  }

  throw new Error(
    `${label} is not a valid image (${bytes.length} bytes, header: ${preview.slice(0, 24)})`,
  );
}