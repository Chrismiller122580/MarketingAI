"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCreatorAccess } from "@/hooks/use-creator-access";
import { ENTERPRISE_PLUS_LABEL } from "@/lib/plans";
import { LoadingSkeleton } from "./loading-indicator";

export function CreatorUpgradeWall({
  title = "Creator Studio",
}: {
  title?: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-8 text-center dark:border-violet-900/50 dark:from-violet-950/30 dark:to-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
        {ENTERPRISE_PLUS_LABEL}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {title} is on {ENTERPRISE_PLUS_LABEL}
      </h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Influencer avatars and Present motion clips live here.
        Your marketing workspace — crawl, generate, schedule, and publish — is
        ready on the dashboard now.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/billing"
          className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          View plans
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export function CreatorGate({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const { allowed, ready } = useCreatorAccess();

  if (!ready) {
    return (
      <div className="space-y-3 p-2">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!allowed) return <CreatorUpgradeWall title={title} />;
  return <>{children}</>;
}
