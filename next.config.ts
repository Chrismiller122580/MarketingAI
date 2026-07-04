import type { NextConfig } from "next";
import { getAppOrigin } from "./src/lib/app-url";

// Never bake VERCEL_URL — it changes per deployment and breaks OAuth redirect URIs.
const appOrigin = getAppOrigin();
const publicAppUrl =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : "http://localhost:3000"
    : appOrigin;

const nextConfig: NextConfig = {
  env: {
    // Bake canonical URL into client bundle so signOut/signIn don't use raw VERCEL_URL
    ...(publicAppUrl
      ? { NEXTAUTH_URL: publicAppUrl, NEXT_PUBLIC_APP_URL: publicAppUrl }
      : {}),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
  },
};

export default nextConfig;