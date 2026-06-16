"use client";

import { SiteProvider } from "@/context/site-context";
import { SettingsProvider } from "@/context/settings-context";
import { PostsProvider } from "@/context/posts-context";
import { AuthSessionProvider } from "./session-provider";
import { ThemeProvider } from "./theme-provider";
import { PwaManager } from "./pwa-manager";
import { PwaUpdateBanner } from "./pwa-update-banner";
import { SocialLinker } from "./social-linker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PwaManager />
      <PwaUpdateBanner />
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