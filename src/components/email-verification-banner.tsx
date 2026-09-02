"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const refreshed = useRef(false);
  const checkedAccount = useRef(false);

  useEffect(() => {
    if (searchParams.get("verified") !== "1" || refreshed.current) return;
    refreshed.current = true;
    setVerified(true);
    void update();
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  }, [searchParams, update]);

  useEffect(() => {
    if (checkedAccount.current) return;
    if (!session?.user?.id || session.user.emailVerified) return;
    checkedAccount.current = true;
    void fetch("/api/account")
      .then((res) => res.json())
      .then((data: { user?: { emailVerified?: string | null } }) => {
        if (data.user?.emailVerified) {
          setVerified(true);
          void update();
        }
      })
      .catch(() => {});
  }, [session?.user?.id, session?.user?.emailVerified, update]);

  if (verified) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/50 dark:bg-green-950/30">
        <p className="text-sm text-green-900 dark:text-green-100">
          Email verified successfully.
        </p>
      </div>
    );
  }

  if (!session?.user?.id || session.user.emailVerified) {
    return null;
  }

  async function resend() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(
          data.error ??
            (res.status === 503
              ? "Email service is not configured yet. You can keep using the app."
              : "Failed to send"),
        );
      }
      if (data.message === "Email already verified") {
        setVerified(true);
        void update();
        return;
      }
      setMsg("Verification email sent — check inbox and spam.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-amber-900 dark:text-amber-100">
          Please verify your email address to secure your account. Check spam
          if you do not see it.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resend}
          disabled={loading}
          className="shrink-0 border-amber-300 bg-white hover:bg-amber-100 dark:border-amber-800 dark:bg-transparent"
        >
          {loading ? "Sending…" : "Resend email"}
        </Button>
      </div>
      {msg && (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{msg}</p>
      )}
    </div>
  );
}
