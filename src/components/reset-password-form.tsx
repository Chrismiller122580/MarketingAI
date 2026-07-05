"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link. Request a new one.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Reset failed");
      }

      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm text-center">
        <p className="text-sm text-muted-foreground">
          This reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a new password for your account
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
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
          disabled={loading}
          className="mt-6 w-full bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}