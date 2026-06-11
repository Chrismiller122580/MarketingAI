"use client";

import { useSite } from "@/context/site-context";

const colorMap: Record<string, string> = {
  crawl: "bg-teal-50 text-teal-700 border-teal-100",
  spark: "bg-amber-50 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  teal: "bg-teal-50 text-teal-700 border-teal-100",
};

export function StatsCards() {
  const { site } = useSite();

  const stats = site
    ? [
        {
          label: "Brand",
          value: site.brand.name,
          change: site.brand.tone,
          color: "spark",
        },
        {
          label: "Pages Indexed",
          value: String(site.pages.length),
          change: "Full-site crawl",
          color: "crawl",
        },
        {
          label: "Images Found",
          value: String(site.images.length),
          change: "Auto-matched to posts",
          color: "teal",
        },
        {
          label: "Keywords",
          value: String(site.brand.keywords.length),
          change: site.brand.keywords.slice(0, 3).join(", ") || "Analyzing…",
          color: "spark",
        },
      ]
    : [
        {
          label: "Brand",
          value: "—",
          change: "Add a domain to start",
          color: "spark",
        },
        {
          label: "Pages Indexed",
          value: "0",
          change: "No site loaded",
          color: "crawl",
        },
        {
          label: "Images Found",
          value: "0",
          change: "For post visuals",
          color: "teal",
        },
        {
          label: "Keywords",
          value: "0",
          change: "AI brand analysis",
          color: "spark",
        },
      ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
          <p className="mt-2 truncate text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {stat.value}
          </p>
          <span
            className={`mt-3 inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorMap[stat.color]}`}
          >
            {stat.change}
          </span>
        </div>
      ))}
    </div>
  );
}