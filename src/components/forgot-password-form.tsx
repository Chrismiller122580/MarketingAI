"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
          <h1 className="text-xl font-bold text-foreground">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for {email}, we sent a password reset link.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a reset link
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
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
          disabled={loading}
          className="mt-6 w-full bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}