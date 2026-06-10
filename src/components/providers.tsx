"use client";

import { SiteProvider } from "@/context/site-context";
import { SettingsProvider } from "@/context/settings-context";
import { PostsProvider } from "@/context/posts-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteProvider>
      <SettingsProvider>
        <PostsProvider>{children}</PostsProvider>
      </SettingsProvider>
    </SiteProvider>
  );
}