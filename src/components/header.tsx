"use client";

import { usePathname } from "next/navigation";
import { useSite } from "@/context/site-context";
import { DomainInput } from "./domain-input";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard",
    subtitle: "Welcome back. Here's your marketing overview.",
  },
  "/campaigns": {
    title: "Campaigns",
    subtitle: "Campaigns built from your site content.",
  },
  "/content": {
    title: "Content Studio",
    subtitle: "Generate copy grounded in your site's pages.",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Overview of your crawled site content.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Configure your profile and site domain.",
  },
};

export function Header() {
  const pathname = usePathname();
  const { site } = useSite();
  const page = pageTitles[pathname] ?? pageTitles["/"];

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-8 py-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{page.title}</h1>
        <p className="text-sm text-slate-500">
          {site ? (
            <>
              Active site:{" "}
              <span className="font-medium text-indigo-600">{site.domain}</span>
              {" · "}
              {site.pages.length} pages indexed
            </>
          ) : (
            page.subtitle
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <DomainInput compact />

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        >
          <span className="text-sm">🔔</span>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
          JD
        </div>
      </div>
    </header>
  );
}