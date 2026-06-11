"use client";

import { useEffect, useState } from "react";
import { clearDeferredPrompt, getDeferredPrompt, triggerInstall } from "./pwa-manager";

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const check = () => {
      // Show if we have a captured prompt, or if not in standalone (heuristic)
      const hasPrompt = !!getDeferredPrompt();
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ((window.navigator as unknown) as { standalone?: boolean }).standalone === true;
      setCanInstall(hasPrompt && !isStandalone);
    };

    check();

    const onAvailable = () => check();
    const onDismissed = () => {
      clearDeferredPrompt();
      setCanInstall(false);
    };

    window.addEventListener("pwa-install-available", onAvailable);
    window.addEventListener("pwa-install-dismissed", onDismissed);

    // Also recheck on visibility (user may have changed mode)
    const onVis = () => check();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("pwa-install-available", onAvailable);
      window.removeEventListener("pwa-install-dismissed", onDismissed);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!canInstall) return null;

  async function handleInstall() {
    setIsInstalling(true);
    const accepted = await triggerInstall();
    setIsInstalling(false);
    if (!accepted) {
      // user dismissed native prompt; hide our button
      setCanInstall(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={isInstalling}
      aria-label="Install crawlspark.ai app"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${className}`}
    >
      <span aria-hidden>⬇︎</span>
      <span>{isInstalling ? "Installing..." : "Install app"}</span>
    </button>
  );
}
