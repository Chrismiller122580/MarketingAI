"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AppLoader } from "./app-loader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change (good UX on mobile).
  // The linter warns on setState in effects; this is intentional side-effect of external route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleMobile() {
    setMobileOpen((v) => !v);
  }

  return (
    <AppLoader>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Sidebar: desktop static | mobile slide-in drawer */}
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        {/* Backdrop for mobile drawer */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuClick={toggleMobile} mobileOpen={mobileOpen} />
          <main className="flex-1 overflow-y-auto p-4 pb-[env(safe-area-inset-bottom)] md:p-8">
            {children}
          </main>
        </div>
      </div>
    </AppLoader>
  );
}