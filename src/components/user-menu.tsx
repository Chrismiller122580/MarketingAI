"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { PlanBadge } from "./plan-badge";

export function UserMenu() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <div className="flex items-center justify-end gap-1.5">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {name}
          </p>
          {session?.user?.role === "admin" && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
              Admin
            </span>
          )}
          <span className="hidden lg:inline"><PlanBadge compact /></span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">{session?.user?.email}</p>
      </div>
      <Link
        href="/billing"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400"
        title="Billing & plan"
      >
        {initials}
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        Sign out
      </button>
      <div className="hidden text-[10px] text-slate-400 sm:block">
        <Link href="/domains" className="hover:text-slate-500">Domains</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-slate-500">Privacy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-slate-500">Terms</Link>
      </div>
    </div>
  );
}