"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/campaigns", label: "Campaigns", icon: "◎" },
  { href: "/content", label: "Content Studio", icon: "✦" },
  { href: "/posts", label: "Post Library", icon: "▤" },
  { href: "/analytics", label: "Analytics", icon: "▣" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const items = isAdmin
    ? [...navItems, { href: "/admin", label: "Admin", icon: "★" }]
    : navItems;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 dark:border-slate-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-crawl-700 to-spark-500 text-sm font-bold text-white">
          C
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          crawlspark.ai
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-4">
        <div className="rounded-lg bg-gradient-to-br from-crawl-800 to-spark-500 p-4 text-white">
          <p className="text-sm font-medium">Crawl your site</p>
          <p className="mt-1 text-xs text-spark-100">
            Spark your content — generate, schedule, and publish.
          </p>
        </div>
      </div>
    </aside>
  );
}