export function isBlobServeUrl(url: string): boolean {
  return (
    url.startsWith("/api/media/blob?") || /\/api\/media\/blob\?/.test(url)
  );
}

export function isPrivateBlobUrl(url: string): boolean {
  return /\.private\.blob\.vercel-storage\.com/i.test(url);
}

export function extractBlobPathname(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/blob\.vercel-storage\.com/i.test(parsed.href)) return null;
    const pathname = parsed.pathname.replace(/^\/+/, "");
    return pathname || null;
  } catch {
    return null;
  }
}

export function blobServePath(pathname: string): string {
  return `/api/media/blob?pathname=${encodeURIComponent(pathname)}`;
}

/** Same-origin URL for img/video/audio elements in the browser. */
export function resolveDisplayMediaUrl(url: string): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;

  if (url.startsWith("/api/media/blob?")) return url;

  const serveMatch = url.match(/\/api\/media\/blob\?[^#]+/);
  if (serveMatch) return serveMatch[0];

  const pathname = extractBlobPathname(url);
  if (pathname && isPrivateBlobUrl(url)) {
    return blobServePath(pathname);
  }

  return url;
}