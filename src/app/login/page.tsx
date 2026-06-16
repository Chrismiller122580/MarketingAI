import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthChrome } from "@/components/auth-chrome";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-crawl-50/40 to-spark-50/30 px-4 dark:from-slate-950 dark:via-crawl-950/30 dark:to-spark-950/20">
      <AuthChrome />
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}