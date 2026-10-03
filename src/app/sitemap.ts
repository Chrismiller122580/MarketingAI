import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: "https://www.crawlspark.ai/", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://www.crawlspark.ai/signup", lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.crawlspark.ai/login", lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: "https://www.crawlspark.ai/privacy", lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.crawlspark.ai/terms", lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.crawlspark.ai/domains", lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
