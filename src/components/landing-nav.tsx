"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";

export function LandingNav() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-crawl-700 to-spark-500 text-sm font-bold text-white">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            crawlspark.ai
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400 md:flex">
          <a href="#features" className="transition hover:text-slate-900 dark:hover:text-slate-100">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-slate-900 dark:hover:text-slate-100">
            How it works
          </a>
          <a href="#platforms" className="transition hover:text-slate-900 dark:hover:text-slate-100">
            Platforms
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:text-slate-900 dark:text-slate-100 sm:inline-block"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}