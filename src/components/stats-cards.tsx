"use client";

import { useSite } from "@/context/site-context";

const colorMap: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
};

export function StatsCards() {
  const { site } = useSite();

  const stats = site
    ? [
        {
          label: "Brand",
          value: site.brand.name,
          change: site.brand.tone,
          color: "indigo",
        },
        {
          label: "Pages Indexed",
          value: String(site.pages.length),
          change: "Full-site crawl",
          color: "emerald",
        },
        {
          label: "Images Found",
          value: String(site.images.length),
          change: "Auto-matched to posts",
          color: "violet",
        },
        {
          label: "Keywords",
          value: String(site.brand.keywords.length),
          change: site.brand.keywords.slice(0, 3).join(", ") || "Analyzing…",
          color: "amber",
        },
      ]
    : [
        {
          label: "Brand",
          value: "—",
          change: "Add a domain to start",
          color: "indigo",
        },
        {
          label: "Pages Indexed",
          value: "0",
          change: "No site loaded",
          color: "emerald",
        },
        {
          label: "Images Found",
          value: "0",
          change: "For post visuals",
          color: "violet",
        },
        {
          label: "Keywords",
          value: "0",
          change: "AI brand analysis",
          color: "amber",
        },
      ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-500">{stat.label}</p>
          <p className="mt-2 truncate text-3xl font-bold tracking-tight text-slate-900">
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