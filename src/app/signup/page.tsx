import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40 px-4">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}