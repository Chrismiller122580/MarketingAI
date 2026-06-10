"use client";

import { SiteProvider } from "@/context/site-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SiteProvider>{children}</SiteProvider>;
}