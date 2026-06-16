"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";
import { PwaInstallButton } from "./pwa-install-button";

export function LandingNav() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-crawl-700 to-spark-500 text-sm font-bold text-white sm:h-9 sm:w-9">
            C
          </div>
          <span className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100">
            crawlspark.ai
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex dark:text-slate-400">
          <a href="#features" className="transition hover:text-slate-900 dark:hover:text-slate-100">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-slate-900 dark:hover:text-slate-100">
            How it works
          </a>
          <a href="#platforms" className="transition hover:text-slate-900 dark:hover:text-slate-100">
            Platforms
          </a>
          <a href="#pricing" className="transition hover:text-slate-900 dark:hover:text-slate-100">
            Pricing
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <PwaInstallButton className="hidden md:inline-flex" />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 sm:px-4"
            >
              <span className="hidden sm:inline">Go to dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 md:inline-block dark:text-slate-300 dark:hover:text-slate-100"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 sm:px-4"
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