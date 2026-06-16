"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { appUrl } from "@/lib/app-url";

export function UserMenu() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!session) return null;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="hidden max-w-[10rem] text-right md:block">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {name}
        </p>
        {session.user?.role === "admin" && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            Admin
          </p>
        )}
      </div>
      <Link
        href="/billing"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400"
        title="Billing & plan"
      >
        {initials}
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: appUrl("/login") })}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 sm:px-3 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span className="sm:hidden" aria-label="Sign out">
          ↪
        </span>
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}