import type { NextConfig } from "next";
import { getAppOrigin } from "./src/lib/app-url";

// Never bake VERCEL_URL — it changes per deployment and breaks OAuth redirect URIs.
const appOrigin = getAppOrigin();

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