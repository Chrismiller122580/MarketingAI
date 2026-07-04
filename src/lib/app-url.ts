function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

/** Prefer www for crawlspark.ai — apex redirects break Meta OAuth redirect validation. */
function canonicalizeProductionHost(host: string): string {
  const bare = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (bare === "crawlspark.ai") return "https://www.crawlspark.ai";
  return normalizeOrigin(bare);
}

/** Canonical app origin for redirects, OAuth callbacks, and Meta URLs. */
export function getAppOrigin(): string {
  // Local `next dev` must use localhost — production AUTH_URL in .env breaks sign-in.
  if (
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL &&
    !process.env.VERCEL_URL
  ) {
    const local =
      process.env.AUTH_URL_LOCAL ??
      (process.env.AUTH_URL?.includes("localhost")
        ? process.env.AUTH_URL
        : undefined);
    if (local) return normalizeOrigin(local);
    return "http://localhost:3000";
  }

  const explicit =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return normalizeOrigin(explicit);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionHost) return canonicalizeProductionHost(productionHost);

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

/** Client-safe canonical URL (NEXT_PUBLIC_APP_URL or current origin). */
export function getPublicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return getAppOrigin();
}

export function appUrl(path: string): string {
  const base = getPublicAppUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}