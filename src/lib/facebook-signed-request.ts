import { createHmac, timingSafeEqual } from "crypto";

type SignedRequestPayload = {
  algorithm?: string;
  expires?: number;
  issued_at?: number;
  user_id?: string;
};

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return Buffer.from(padded, "base64").toString("utf8");
}

export function parseFacebookSignedRequest(
  signedRequest: string,
  appSecret: string,
): SignedRequestPayload | null {
  const parts = signedRequest.split(".", 2);
  if (parts.length !== 2) return null;

  const [encodedSig, payload] = parts;

  try {
    const sig = Buffer.from(
      encodedSig.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    );
    const expectedSig = createHmac("sha256", appSecret)
      .update(payload)
      .digest();

    if (sig.length !== expectedSig.length || !timingSafeEqual(sig, expectedSig)) {
      return null;
    }

    const data = JSON.parse(base64UrlDecode(payload)) as SignedRequestPayload;
    if (data.algorithm && data.algorithm !== "HMAC-SHA256") {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}