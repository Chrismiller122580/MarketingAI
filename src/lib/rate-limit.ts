// Simple in-memory rate limiter for crawlspark.ai
// Note: Resets on serverless instance cold starts / scale. Good enough for MVP abuse protection.
// For production multi-region, replace with Upstash Redis / Vercel KV or similar.

type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window (resets on first hit after expiry)

export const RATE_LIMITS = {
  crawl: { max: 30, windowMs: WINDOW_MS },   // generous for paid users
  generate: { max: 200, windowMs: WINDOW_MS }, // single + batch calls
  video: { max: 10, windowMs: WINDOW_MS }, // AI video ads are expensive
  motion: { max: 12, windowMs: WINDOW_MS }, // influencer motion clips
  voice: { max: 40, windowMs: WINDOW_MS }, // ElevenLabs voice previews
  metrics: { max: 20, windowMs: WINDOW_MS }, // social metrics refresh
};

export const IP_RATE_LIMITS = {
  authRegister: { max: 5, windowMs: WINDOW_MS },
  authForgotPassword: { max: 3, windowMs: WINDOW_MS },
  authLogin: { max: 20, windowMs: WINDOW_MS },
  authResendVerification: { max: 3, windowMs: WINDOW_MS },
};

export type RateLimitAction = keyof typeof RATE_LIMITS;
export type IpRateLimitAction = keyof typeof IP_RATE_LIMITS;

const ipBuckets = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(
  userId: string,
  action: RateLimitAction,
): { allowed: boolean; retryAfterSeconds?: number; limit: number } {
  const cfg = RATE_LIMITS[action];
  const key = `${userId}:${action}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.reset) {
    bucket = { count: 0, reset: now + cfg.windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= cfg.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.reset - now) / 1000));
    return { allowed: false, retryAfterSeconds, limit: cfg.max };
  }

  bucket.count += 1;
  return { allowed: true, limit: cfg.max };
}

export function checkIpRateLimit(
  ip: string,
  action: IpRateLimitAction,
): { allowed: boolean; retryAfterSeconds?: number; limit: number } {
  const cfg = IP_RATE_LIMITS[action];
  const key = `ip:${ip}:${action}`;
  const now = Date.now();

  let bucket = ipBuckets.get(key);
  if (!bucket || now >= bucket.reset) {
    bucket = { count: 0, reset: now + cfg.windowMs };
    ipBuckets.set(key, bucket);
  }

  if (bucket.count >= cfg.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.reset - now) / 1000));
    return { allowed: false, retryAfterSeconds, limit: cfg.max };
  }

  bucket.count += 1;
  return { allowed: true, limit: cfg.max };
}
