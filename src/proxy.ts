import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";
  const isLanding = pathname === "/";
  const isPublicPage =
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/domains" ||
    pathname === "/data-deletion" ||
    pathname === "/verify-email" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/world/") ||
    pathname.startsWith("/.well-known/");
  const isPublicApi =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/og/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/media/blob") ||
    pathname.startsWith("/api/world/") ||
    pathname === "/api/facebook/data-deletion" ||
    pathname === "/api/billing/stripe/webhook" ||
    pathname === "/api/health/db";
  const isPwaAsset =
    pathname === "/manifest.webmanifest" || pathname === "/sw.js";

  if (isPublicApi || isLanding || isPublicPage || isPwaAsset) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isAuthPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
