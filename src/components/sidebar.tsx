"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandLogo } from "./brand-logo";
import { MenuButton } from "./menu-button";
import { useCreatorAccess } from "@/hooks/use-creator-access";
import {
  NavIconAdmin,
  NavIconAnalytics,
  NavIconBilling,
  NavIconCampaigns,
  NavIconContent,
  NavIconCreatorStudio,
  NavIconDashboard,
  NavIconPosts,
  NavIconSettings,
  NavIconWorld,
} from "./nav-icons";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const marketingItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: NavIconDashboard },
  { href: "/campaigns", label: "Campaigns", icon: NavIconCampaigns },
  { href: "/content", label: "Content Studio", icon: NavIconContent },
  { href: "/posts", label: "Post Library", icon: NavIconPosts },
  { href: "/analytics", label: "Analytics", icon: NavIconAnalytics },
  { href: "/billing", label: "Billing", icon: NavIconBilling },
  { href: "/settings", label: "Settings", icon: NavIconSettings },
];

const creatorItems: NavItem[] = [
  { href: "/creator-studio", label: "Creator Studio", icon: NavIconCreatorStudio },
  { href: "/avatar-world", label: "Avatar World", icon: NavIconWorld },
];

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick: () => void;
}) {
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      {item.label}
    </Link>
  );
}

export function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const { allowed: showCreator } = useCreatorAccess();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900
        transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-64 lg:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-4 dark:border-slate-800 md:px-5">
        <BrandLogo href="/dashboard" size="sm" onClick={handleNavClick} />
        {onClose && (
          <MenuButton
            open
            onClick={onClose}
            label="Close navigation"
            className="lg:hidden"
          />
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3 md:p-4">
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Marketing
        </p>
        {marketingItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={handleNavClick}
          />
        ))}

        {showCreator && (
          <>
            <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Creator
            </p>
            {creatorItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onClick={handleNavClick}
              />
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Admin
            </p>
            <NavLink
              item={{ href: "/admin", label: "Admin", icon: NavIconAdmin }}
              pathname={pathname}
              onClick={handleNavClick}
            />
          </>
        )}
      </nav>

      <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="rounded-lg bg-gradient-to-br from-crawl-800 to-spark-500 p-4 text-white">
          <p className="text-sm font-medium">Crawl your site</p>
          <p className="mt-1 text-xs text-spark-100">
            Spark your content — generate, schedule, and publish.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-slate-400">
          <Link
            href="/domains"
            className="hover:text-slate-600 dark:hover:text-slate-300"
            onClick={handleNavClick}
          >
            Domains
          </Link>
          <Link
            href="/privacy"
            className="hover:text-slate-600 dark:hover:text-slate-300"
            onClick={handleNavClick}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-slate-600 dark:hover:text-slate-300"
            onClick={handleNavClick}
          >
            Terms
          </Link>
        </div>
      </div>
    </aside>
  );
}
