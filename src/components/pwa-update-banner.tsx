"use client";

import { useEffect, useState } from "react";

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    window.addEventListener("pwa-update-available", onUpdate);
    return () => window.removeEventListener("pwa-update-available", onUpdate);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[60] mb-[env(safe-area-inset-bottom)] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-amber-900 dark:bg-slate-900"
    >
      <span className="text-slate-700 dark:text-slate-200">
        A new version is available.
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem("pwa-reload", "1");
            } catch {
              /* ignore */
            }
            window.location.reload();
          }}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}