"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const navItems = [
  { href: "/", label: "Dashboard", icon: "◈" },
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
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          M
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          MarketingAI
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white">
          <p className="text-sm font-medium">AI Marketing Suite</p>
          <p className="mt-1 text-xs text-indigo-100">
            Crawl, generate, schedule, and publish — all in one place.
          </p>
        </div>
      </div>
    </aside>
  );
}