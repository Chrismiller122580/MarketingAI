"use client";

import { ThemedToaster } from "./themed-toaster";
import { SiteProvider } from "@/context/site-context";
import { SettingsProvider } from "@/context/settings-context";
import { PostsProvider } from "@/context/posts-context";
import { AuthSessionProvider } from "./session-provider";
import { ThemeProvider } from "./theme-provider";
import { PwaManager } from "./pwa-manager";
import { PwaUpdateBanner } from "./pwa-update-banner";
import { PwaInstallBanner } from "./pwa-install-banner";
import { SocialLinker } from "./social-linker";
import { SessionGuard } from "./session-guard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PwaManager />
      <PwaUpdateBanner />
      <PwaInstallBanner />
      <AuthSessionProvider>
        <SessionGuard />
        <SiteProvider>
          <SocialLinker />
          <SettingsProvider>
            <PostsProvider>
              {children}
              <ThemedToaster />
            </PostsProvider>
          </SettingsProvider>
        </SiteProvider>
      </AuthSessionProvider>
    </ThemeProvider>
  );
}