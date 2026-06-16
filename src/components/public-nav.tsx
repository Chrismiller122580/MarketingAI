"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BrandLogo } from "./brand-logo";
import { MenuButton } from "./menu-button";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/domains", label: "Domains" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <BrandLogo href="/" size="sm" onClick={() => setOpen(false)} />

        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex dark:text-slate-400">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-slate-900 dark:hover:text-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className="hidden sm:flex" />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="hidden rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 sm:inline-block"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:inline-block dark:text-slate-300 dark:hover:text-slate-100"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 sm:inline-block"
              >
                Get started
              </Link>
            </>
          )}
          <MenuButton
            open={open}
            onClick={() => setOpen((v) => !v)}
            label={open ? "Close menu" : "Open menu"}
            className="md:hidden"
          />
        </div>
      </div>

      {open && (
        <nav className="border-t border-slate-100 px-4 py-3 md:hidden dark:border-slate-800">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <ThemeToggle className="sm:hidden" />
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-amber-700"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-amber-700"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}