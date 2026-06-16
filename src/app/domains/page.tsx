"use client";

import Link from "next/link";
import { PublicNav } from "@/components/public-nav";

export default function TrustedDomains() {
  const lastUpdated = "June 11, 2026";

  const primaryDomains = [
    "crawlspark.ai",
    "app.crawlspark.ai",
  ];

  const publicPages = [
    "https://crawlspark.ai",
    "https://crawlspark.ai/signup",
    "https://crawlspark.ai/login",
    "https://crawlspark.ai/privacy",
    "https://crawlspark.ai/terms",
    "https://crawlspark.ai/billing",
  ];

  const commaSeparated = primaryDomains.join(",");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicNav />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Trusted Domains
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            This page lists the official domains and public URLs used by <strong>crawlspark.ai</strong>. 
            These are the domains that appear as links on our website and that we recommend for advertising platforms 
            (such as Meta’s Domain Security / Trusted Domains feature).
          </p>

          <p>
            Only ads directing to these domains (or subpaths under them) should be considered official. 
            Adding these domains helps prevent ads from being blocked or requiring extra approval.
          </p>

          <h2>Primary Domains</h2>
          <p>
            Add these as your core trusted domains. You can paste them as comma-separated values:
          </p>

          <div className="my-4 rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm dark:border-slate-700 dark:bg-slate-900">
            {commaSeparated}
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(commaSeparated)}
            className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            Copy comma-separated list
          </button>

          <h2>Full List of Public Pages</h2>
          <p>
            These are the main public-facing pages and CTAs on the site:
          </p>

          <ul className="mt-4 space-y-1 text-sm">
            {publicPages.map((url) => (
              <li key={url}>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline dark:text-amber-400"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>

          <div className="my-6 rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm dark:border-slate-700 dark:bg-slate-900">
            {publicPages.join("\n")}
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(publicPages.join("\n"))}
            className="mb-8 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            Copy full list (one per line)
          </button>

          <h2>Additional Notes for Advertisers</h2>
          <ul>
            <li>The primary marketing site lives at <strong>crawlspark.ai</strong>.</li>
            <li>The web application experience is demonstrated at <strong>app.crawlspark.ai</strong> (shown in our product screenshots and demo).</li>
            <li>All sign-up, login, pricing, and legal pages are hosted under the above domains.</li>
            <li>We do not currently use third-party domains for core marketing or conversion flows.</li>
          </ul>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            If you are setting up ads on Meta (or other platforms) and need these domains whitelisted under 
            “Domain Security” or “Trusted Domains”, you can use the lists above.
          </p>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            For any questions about our advertising domains, please contact us at{" "}
            <a href="mailto:legal@crawlspark.ai" className="text-amber-600 hover:underline">
              legal@crawlspark.ai
            </a>.
          </p>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8 text-center dark:border-slate-800">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
            ← Back to crawlspark.ai
          </Link>
        </div>
      </main>
    </div>
  );
}
