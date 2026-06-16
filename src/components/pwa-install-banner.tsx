"use client";

import { useEffect, useState } from "react";
import { triggerInstall } from "./pwa-manager";

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standaloneMq = window.matchMedia("(display-mode: standalone)");
    const compactMq = window.matchMedia("(max-width: 1023px)");

    const isStandalone =
      standaloneMq.matches ||
      ((window.navigator as unknown) as { standalone?: boolean }).standalone === true;

    const onAvailable = () => {
      // Bottom banner on viewports where the header install button is hidden
      if (!isStandalone && compactMq.matches) setVisible(true);
    };
    const onDismissed = () => setVisible(false);

    window.addEventListener("pwa-install-available", onAvailable);
    window.addEventListener("pwa-install-dismissed", onDismissed);
    window.addEventListener("appinstalled", onDismissed);

    return () => {
      window.removeEventListener("pwa-install-available", onAvailable);
      window.removeEventListener("pwa-install-dismissed", onDismissed);
      window.removeEventListener("appinstalled", onDismissed);
    };
  }, []);

  if (!visible) return null;

  async function handleInstall() {
    setInstalling(true);
    const accepted = await triggerInstall();
    setInstalling(false);
    if (accepted) setVisible(false);
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      <span className="text-slate-700 dark:text-slate-200">
        Install crawlspark.ai for quick access
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {installing ? "Installing…" : "Install"}
        </button>
      </div>
    </div>
  );
}