"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSite } from "@/context/site-context";
import { usePosts } from "@/context/posts-context";
import { useEmailVerified } from "@/hooks/use-email-verified";

const DISMISS_KEY = "crawlspark-first-run-dismissed";

type Step = {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

export function FirstRunChecklist() {
  const emailVerified = useEmailVerified();
  const { site, savedSites, siteSocialConnections } = useSite();
  const { posts } = usePosts();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const steps = useMemo<Step[]>(() => {
    const hasSite = Boolean(site) || savedSites.length > 0;
    const hasPost = posts.length > 0;
    const hasSocial = Object.keys(siteSocialConnections).length > 0;

    return [
      {
        id: "email",
        label: "Verify your email",
        hint: "Required before connecting Instagram or Facebook.",
        href: "/dashboard",
        done: emailVerified,
      },
      {
        id: "crawl",
        label: "Add and crawl your website",
        hint: "Free includes one site. Brand voice and images come from your live pages.",
        href: "/dashboard",
        done: hasSite,
      },
      {
        id: "post",
        label: "Generate and save your first post",
        hint: "Free includes 15 posts this month from your crawled pages.",
        href: "/content",
        done: hasPost,
      },
      {
        id: "social",
        label: "Connect a social account",
        hint: "Or publish with a share link from the Post Library.",
        href: "/settings",
        done: hasSocial,
      },
    ];
  }, [
    posts.length,
    savedSites.length,
    emailVerified,
    site,
    siteSocialConnections,
  ]);

  const doneCount = steps.filter((step) => step.done).length;
  const complete = doneCount === steps.length;

  if (dismissed || complete) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore quota / private mode */
    }
    setDismissed(true);
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-spark-50 p-5 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:to-spark-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            First-run checklist
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Ship your first post
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {doneCount} of {steps.length} complete. Creator Studio can wait until
            this loop works.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200"
        >
          Hide
        </button>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                step.done
                  ? "border-emerald-200 bg-white/80 dark:border-emerald-900/40 dark:bg-slate-900/40"
                  : "border-slate-200 bg-white hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-700"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                  {step.hint}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
