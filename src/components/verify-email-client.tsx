"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type Status = "working" | "ok" | "error";

const verifyingTokens = new Set<string>();
const verifiedTokens = new Set<string>();

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [status, setStatus] = useState<Status>(() =>
    searchParams.get("error") ? "error" : "working",
  );

  useEffect(() => {
    const token = searchParams.get("token")?.trim() ?? "";
    const presetError = searchParams.get("error");
    const presetOk = searchParams.get("ok") === "1";

    if (presetOk) {
      setStatus("ok");
      return;
    }
    if (presetError || !token) {
      setStatus("error");
      return;
    }
    if (verifiedTokens.has(token)) {
      setStatus("ok");
      return;
    }
    if (verifyingTokens.has(token)) return;

    verifyingTokens.add(token);
    setStatus("working");

    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (res.ok && data.ok) {
          verifiedTokens.add(token);
          setStatus("ok");
          return;
        }
        setStatus((prev) => (prev === "ok" ? "ok" : "error"));
      })
      .catch(() => {
        setStatus((prev) => (prev === "ok" ? "ok" : "error"));
      })
      .finally(() => {
        verifyingTokens.delete(token);
      });
  }, [searchParams]);

  const loggedIn = Boolean(session?.user?.id);

  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-crawl-700 to-spark-500 text-lg font-bold text-white">
        C
      </div>
      {status === "working" && (
        <>
          <h1 className="text-2xl font-bold text-foreground">Verifying email…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hang tight — this only takes a moment.
          </p>
        </>
      )}
      {status === "ok" && (
        <>
          <h1 className="text-2xl font-bold text-foreground">Email verified</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is confirmed. You can keep using crawlspark.ai.
          </p>
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-amber-600 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-amber-700"
          >
            {loggedIn ? "Continue to dashboard" : "Sign in"}
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-foreground">
            This link expired
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have already been used, or it sat in spam past 24 hours.
            Sign in and tap Resend email if you still need to verify.
          </p>
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-amber-600 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-amber-700"
          >
            {loggedIn ? "Go to dashboard" : "Sign in"}
          </Link>
        </>
      )}
    </div>
  );
}
