"use client";

import type { UniquenessReport } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (score >= 50) return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
}

export function UniquenessBadge({
  report,
}: {
  report?: UniquenessReport | null;
}) {
  if (!report) return null;

  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-violet-600 dark:text-violet-400">
          Uniqueness
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreColor(report.score)}`}
        >
          {report.score}/100
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {report.tips.map((tip) => (
          <li
            key={tip}
            className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"
          >
            <span className="text-violet-400">→</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}