import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "crawlspark_link_uid";
const MAX_AGE = 600;

function secret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function signLinkUserId(userId: string): string {
  const sig = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verifyLinkUserId(value: string | undefined): string | null {
  if (!value || !secret()) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(userId).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export function linkUserCookieHeader(userId: string, host: string): string {
  const domain = host.includes("crawlspark.ai")
    ? "; Domain=.crawlspark.ai"
    : "";
  return `${COOKIE}=${signLinkUserId(userId)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax${domain}`;
}

export const LINK_USER_COOKIE = COOKIE;
