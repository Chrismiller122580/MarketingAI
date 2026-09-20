"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandLogo } from "./brand-logo";
import { MenuButton } from "./menu-button";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/world", label: "World" },
  { href: "/domains", label: "Domains" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const { status } = useSession();
  const pathname = usePathname();
  const isLoggedIn = status === "authenticated";
  const dark = pathname === "/world" || pathname.startsWith("/world/");

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${
        dark
          ? "border-white/10 bg-[#0b0a0d]/90"
          : "border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90"
      }`}
    >
      <div className="relative mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <BrandLogo
          href="/"
          size="sm"
          onDark={dark}
          onClick={() => setOpen(false)}
          className="max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2"
        />

        <nav
          className={`hidden items-center gap-5 text-sm font-medium md:flex ${
            dark ? "text-zinc-300" : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {links.map((link) => {
            const active =
              link.href === "/world"
                ? pathname === "/world" || pathname.startsWith("/world/")
                : pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition ${
                  active
                    ? dark
                      ? "text-white"
                      : "text-slate-900 dark:text-slate-100"
                    : dark
                      ? "hover:text-white"
                      : "hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-2 md:ml-0">
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
                className={`hidden rounded-lg px-3 py-2 text-sm font-medium transition sm:inline-block ${
                  dark
                    ? "text-zinc-300 hover:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                }`}
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
        <nav
          className={`border-t px-4 py-3 md:hidden ${
            dark
              ? "border-white/10"
              : "border-slate-100 dark:border-slate-800"
          }`}
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  dark
                    ? "text-zinc-200 hover:bg-white/10 hover:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div
              className={`mt-2 flex items-center gap-2 border-t pt-3 ${
                dark
                  ? "border-white/10"
                  : "border-slate-100 dark:border-slate-800"
              }`}
            >
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
                    className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium transition ${
                      dark
                        ? "border-white/15 text-zinc-200 hover:bg-white/10"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
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
