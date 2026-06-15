import type { NextConfig } from "next";

const appOrigin =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const nextConfig: NextConfig = {
  env: {
    // Bake canonical URL into client bundle so signOut/signIn don't use raw VERCEL_URL
    ...(appOrigin ? { NEXTAUTH_URL: appOrigin, NEXT_PUBLIC_APP_URL: appOrigin } : {}),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;