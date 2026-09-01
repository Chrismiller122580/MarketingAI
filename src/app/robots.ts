import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms", "/signup", "/login", "/domains", "/data-deletion"],
      disallow: [
        "/dashboard",
        "/api/",
        "/settings",
        "/admin",
        "/billing",
        "/content",
        "/posts",
        "/campaigns",
        "/creator-studio",
        "/avatar-world",
        "/analytics",
      ],
    },
    sitemap: "https://www.crawlspark.ai/sitemap.xml",
  };
}
