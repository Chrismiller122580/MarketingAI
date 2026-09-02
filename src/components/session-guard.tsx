"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * Social OAuth can mint a session without a crawlspark user id
 * (cookie lost on www/apex, or Meta email missing). APIs then 401
 * and Settings looks empty. Bounce back to sign-in instead.
 */
export function SessionGuard() {
  const { data: session, status } = useSession();
  const leaving = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || leaving.current) return;
    if (session?.user?.id) return;
    leaving.current = true;
    void signOut({ callbackUrl: "/login?error=Reconnect your account to keep going." });
  }, [session?.user?.id, status]);

  return null;
}
