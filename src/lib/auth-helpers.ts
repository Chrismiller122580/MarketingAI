import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function getSession() {
  return auth();
}

export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireAuthUserId(): Promise<string | NextResponse> {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

export async function requireAdmin(): Promise<
  { userId: string; email: string } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
  };
}

export function isAuthError(
  result: string | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

export function isAdminError<T>(
  result: T | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}