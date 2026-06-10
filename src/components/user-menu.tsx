"use client";

import { signOut, useSession } from "next-auth/react";

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
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-400">{session?.user?.email}</p>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
        {initials}
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  );
}