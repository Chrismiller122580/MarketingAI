"use client";

import { SiteProvider } from "@/context/site-context";
import { SettingsProvider } from "@/context/settings-context";
import { PostsProvider } from "@/context/posts-context";
import { AuthSessionProvider } from "./session-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
    <AuthSessionProvider>
      <SiteProvider>
        <SettingsProvider>
          <PostsProvider>{children}</PostsProvider>
        </SettingsProvider>
      </SiteProvider>
    </AuthSessionProvider>
    </ThemeProvider>
  );
}