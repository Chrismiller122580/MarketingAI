"use client";

import { useEffect } from "react";

// Module-scoped so any button can trigger the captured prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

// Custom event so UI buttons can react without context
export function dispatchInstallAvailable() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pwa-install-available"));
  }
}

export function dispatchInstallDismissed() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pwa-install-dismissed"));
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaManager() {
  useEffect(() => {
    // Register service worker (idempotent)
    if ("serviceWorker" in navigator) {
      // Delay slightly to not block first paint
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Optional: log or handle updates
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    window.dispatchEvent(new CustomEvent("pwa-update-available"));
                  }
                });
              }
            });
          })
          .catch(() => {
            // SW registration is best-effort for PWA install; failures are non-fatal
          });
      };
      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register, { once: true });
      }
    }

    // Capture the install prompt for our Install button / banner (not standalone)
    const handler = (e: Event) => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ((window.navigator as unknown) as { standalone?: boolean }).standalone ===
          true;
      if (isStandalone) return;

      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      dispatchInstallAvailable();
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);

    // When app installed, clean up
    const installedHandler = () => {
      deferredPrompt = null;
      dispatchInstallDismissed();
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  return null;
}

export async function triggerInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    const accepted = outcome === "accepted";
    deferredPrompt = null;
    if (!accepted) dispatchInstallDismissed();
    return accepted;
  } catch {
    deferredPrompt = null;
    return false;
  }
}
