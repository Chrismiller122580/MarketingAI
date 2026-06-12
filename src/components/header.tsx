"use client";

import { usePathname } from "next/navigation";
import { useSite } from "@/context/site-context";
import { DomainInput } from "./domain-input";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { PwaInstallButton } from "./pwa-install-button";
import { PlanBadge } from "./plan-badge";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Welcome back. Here's your marketing overview.",
  },
  "/campaigns": {
    title: "Campaigns",
    subtitle: "Campaigns built from your site content.",
  },
  "/content": {
    title: "Content Studio",
    subtitle: "Generate copy grounded in your site's pages.",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Overview of your crawled site content.",
  },
  "/posts": {
    title: "Post Library",
    subtitle: "Saved posts, campaign packs, and your content calendar.",
  },
  "/billing": {
    title: "Billing & Payments",
    subtitle: "Manage your plan and crypto payments.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Configure brand voice, audience, and platforms.",
  },
  "/admin": {
    title: "Admin Stats",
    subtitle: "Platform snapshot: users, payments, data.",
  },
};

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const { site } = useSite();
  const page = pageTitles[pathname] ?? pageTitles["/dashboard"];

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {/* Mobile hamburger */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            ☰
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 md:text-xl truncate">{page.title}</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
            {site ? (
              <>
                Active site:{" "}
                <span className="font-medium text-amber-600">{site.domain}</span>
                {" · "}
                {site.pages.length} pages
              </>
            ) : (
              page.subtitle
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DomainInput compact />

        <PlanBadge compact />

        <PwaInstallButton className="hidden sm:inline-flex" />

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Notifications (coming soon)"
        >
          <span className="text-sm">🔔</span>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <ThemeToggle />

        <UserMenu />
      </div>
    </header>
  );
}