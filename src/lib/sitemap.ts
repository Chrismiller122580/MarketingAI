export async function fetchSitemapUrls(origin: string): Promise<string[]> {
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
  ];

  const urls = new Set<string>();

  for (const sitemapUrl of candidates) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: { "User-Agent": "MarketingAI-Crawler/1.0" },
        redirect: "follow",
      });
      if (!response.ok) continue;

      const xml = await response.text();
      const locs = [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)].map((m) =>
        m[1].trim(),
      );

      for (const loc of locs) {
        if (loc.endsWith(".xml")) {
          const nested = await fetchNestedSitemap(loc);
          nested.forEach((u) => urls.add(u));
        } else if (loc.startsWith(origin)) {
          urls.add(loc);
        }
      }

      if (urls.size > 0) break;
    } catch {
      continue;
    }
  }

  return Array.from(urls);
}

async function fetchNestedSitemap(url: string): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "MarketingAI-Crawler/1.0" },
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)]
      .map((m) => m[1].trim())
      .filter((loc) => !loc.endsWith(".xml"));
  } catch {
    return [];
  }
}