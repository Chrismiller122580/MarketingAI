import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isLanding = pathname === "/";
  const isPublicPage =
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/domains" ||
    pathname === "/data-deletion";
  const isPublicApi =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/og/") ||
    pathname === "/api/facebook/data-deletion";

  if (isPublicApi || isLanding || isPublicPage) return NextResponse.next();

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};