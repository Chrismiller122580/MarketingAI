"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Platform, UserSettings } from "@/lib/types";

const STORAGE_KEY = "marketing-ai-settings";

const DEFAULT_SETTINGS: UserSettings = {
  brandVoice:
    "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
  targetAudience: "Business professionals and decision-makers",
  defaultPlatforms: ["instagram", "linkedin", "twitter"],
  includeHashtags: true,
  emojiStyle: "light",
  preferAiImages: false,
};

type SettingsContextValue = {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
  resetSettings: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}

export function togglePlatform(
  platforms: Platform[],
  platform: Platform,
): Platform[] {
  return platforms.includes(platform)
    ? platforms.filter((p) => p !== platform)
    : [...platforms, platform];
}