import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthChrome } from "@/components/auth-chrome";
import { VerifyEmailClient } from "@/components/verify-email-client";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-crawl-50/40 to-spark-50/30 px-4 dark:from-slate-950 dark:via-crawl-950/30 dark:to-spark-950/20">
      <AuthChrome />
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Verifying email…</p>
        }
      >
        <VerifyEmailClient />
      </Suspense>
    </div>
  );
}
