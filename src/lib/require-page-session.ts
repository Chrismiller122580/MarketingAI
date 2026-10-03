import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth-helpers";

/** Same session the dashboard proxy requires. Redirects logged-out visitors to login. */
export async function requirePageSession(callbackPath: string): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  return userId;
}
