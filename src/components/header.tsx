"use client";

import { usePathname } from "next/navigation";
import { useSite } from "@/context/site-context";
import { DomainInput } from "./domain-input";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";

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
  "/settings": {
    title: "Settings",
    subtitle: "Configure brand voice, audience, and platforms.",
  },
  "/admin": {
    title: "Admin",
    subtitle: "Platform overview and user management.",
  },
};

export function Header() {
  const pathname = usePathname();
  const { site } = useSite();
  const page = pageTitles[pathname] ?? pageTitles["/dashboard"];

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{page.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {site ? (
            <>
              Active site:{" "}
              <span className="font-medium text-amber-600">{site.domain}</span>
              {" · "}
              {site.pages.length} pages indexed
            </>
          ) : (
            page.subtitle
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <DomainInput compact />

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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