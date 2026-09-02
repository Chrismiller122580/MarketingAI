"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Mode = "login" | "signup";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    () => searchParams.get("error"),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        if (!acceptedTerms) {
          throw new Error("Accept the Terms and Privacy Policy to create an account.");
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            termsAccepted: true,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Registration failed");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(
          mode === "signup"
            ? "Account created but sign-in failed. Try logging in."
            : "Invalid email or password",
        );
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      if (
        message.includes("Can't reach database") ||
        message.includes("Environment variable not found: DATABASE_URL")
      ) {
        setError(
          "Database is not configured. Set DATABASE_URL in .env.local and run npm run db:push.",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-crawl-700 to-spark-500 text-lg font-bold text-white">
          C
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignup
            ? "Free: one site and 15 posts a month. No card required."
            : "Sign in to your crawlspark.ai workspace"}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-4">
          {isSignup && (
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className={inputClass}
                placeholder="Jane Doe"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className={inputClass}
              placeholder="••••••••"
            />
            {isSignup && (
              <p className="mt-1 text-xs text-muted-foreground">
                At least 8 characters
              </p>
            )}
            {!isSignup && (
              <p className="mt-1.5 text-right text-xs">
                <Link
                  href="/forgot-password"
                  className="font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  Forgot password?
                </Link>
              </p>
            )}
          </div>

          {isSignup && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                required
              />
              <span>
                I am 18 or older and agree to the{" "}
                <Link href="/terms" className="font-medium text-amber-600 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-medium text-amber-600 hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          )}
        </div>

        {error && (
          <p
            className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || (isSignup && !acceptedTerms)}
          className="mt-6 w-full bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          {loading
            ? "Please wait…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
