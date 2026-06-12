"use client";

import { SiteProvider } from "@/context/site-context";
import { SettingsProvider } from "@/context/settings-context";
import { PostsProvider } from "@/context/posts-context";
import { AuthSessionProvider } from "./session-provider";
import { ThemeProvider } from "./theme-provider";
import { PwaManager } from "./pwa-manager";
import { SocialLinker } from "./social-linker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PwaManager />
      <AuthSessionProvider>
        <SiteProvider>
          <SocialLinker />
          <SettingsProvider>
            <PostsProvider>{children}</PostsProvider>
          </SettingsProvider>
        </SiteProvider>
      </AuthSessionProvider>
    </ThemeProvider>
  );
}