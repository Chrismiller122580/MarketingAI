"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useEmailVerified } from "@/hooks/use-email-verified";

export function EmailVerificationBanner() {
  const { data: session, update } = useSession();
  const emailVerified = useEmailVerified();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#verify-email") return;
    const el = document.getElementById("verify-email");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [emailVerified]);

  if (!session?.user?.id) return null;

  if (emailVerified) {
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
        void update({ emailVerified: new Date().toISOString() });
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
    <div
      id="verify-email"
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30"
    >
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
