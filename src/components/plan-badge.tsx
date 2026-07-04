"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const PLAN_STYLES: Record<string, string> = {
  free: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  pro: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  enterprise: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
};

export function PlanBadge({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const plan = session?.user?.plan || "free";
  const style = PLAN_STYLES[plan] || PLAN_STYLES.free;

  if (!session) return null;

  return (
    <Link href="/billing" className="group">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition group-hover:opacity-80 ${style}`}
        title="Manage billing"
      >
        {plan}
        {!compact && (
          <span className="ml-1 hidden sm:inline text-[10px] opacity-70">plan</span>
        )}
      </span>
    </Link>
  );
}
