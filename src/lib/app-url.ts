/** Canonical app origin for redirects, OAuth callbacks, and Meta URLs. */
export function getAppOrigin(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
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