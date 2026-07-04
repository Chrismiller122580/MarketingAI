"use client";

import { usePathname } from "next/navigation";
import { useSite } from "@/context/site-context";
import { DomainInput } from "./domain-input";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { PwaInstallButton } from "./pwa-install-button";
import { PlanBadge } from "./plan-badge";
import { MenuButton } from "./menu-button";

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
    subtitle: "Generate posts, images, and AI video ads from your site.",
  },
  "/creator-studio": {
    title: "Creator Studio",
    subtitle: "Design hyper-realistic influencer avatars with locked persona fields.",
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

export function Header({
  onMenuClick,
  mobileOpen = false,
}: {
  onMenuClick?: () => void;
  mobileOpen?: boolean;
}) {
  const pathname = usePathname();
  const { site } = useSite();
  const page = pageTitles[pathname] ?? pageTitles["/dashboard"];

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onMenuClick && (
            <MenuButton
              open={mobileOpen}
              onClick={onMenuClick}
              label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              className="md:hidden"
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900 md:text-lg dark:text-slate-100">
              {page.title}
            </h1>
            <p className="truncate text-xs text-slate-500 md:text-sm dark:text-slate-400">
              {site ? (
                <>
                  <span className="font-medium text-amber-600">{site.domain}</span>
                  <span className="hidden sm:inline">
                    {" · "}
                    {site.pages.length} pages
                  </span>
                </>
              ) : (
                page.subtitle
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <div className="hidden xl:block">
            <DomainInput compact />
          </div>
          <PlanBadge compact />
          <PwaInstallButton className="hidden lg:inline-flex" />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 py-2 xl:hidden dark:border-slate-800">
        <DomainInput compact />
      </div>
    </header>
  );
}