"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:bg-slate-950";

type AccountUser = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
};

export function AccountSettings() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [account, setAccount] = useState<AccountUser | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((data: { user?: AccountUser }) => {
        if (data.user) {
          setAccount(data.user);
          setName(data.user.name ?? "");
        }
      })
      .catch(() => {});
  }, []);

  async function saveName() {
    setNameLoading(true);
    setNameMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setNameMsg("Name updated");
      await update({ name });
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : "Update failed");
    } finally {
      setNameLoading(false);
    }
  }

  async function changePassword() {
    setPasswordLoading(true);
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg("New passwords do not match");
      setPasswordLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setPasswordMsg("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMsg(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Delete your account permanently? All sites, posts, and settings will be removed.",
      )
    ) {
      return;
    }
    setDeleteLoading(true);
    setDeleteMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      await signOut({ callbackUrl: "/" });
      router.push("/");
    } catch (err) {
      setDeleteMsg(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }

  const email = account?.email ?? session?.user?.email ?? "";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Account
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your profile and sign-in credentials
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className={`${inputClass} bg-slate-50 dark:bg-slate-900/50 text-slate-500`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          {nameMsg && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{nameMsg}</p>
          )}
          <Button
            type="button"
            onClick={saveName}
            disabled={nameLoading || !name.trim()}
            className="bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900"
          >
            {nameLoading ? "Saving…" : "Save name"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Change password
        </h2>
        <div className="mt-4 space-y-4">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={inputClass}
          />
          {passwordMsg && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{passwordMsg}</p>
          )}
          <Button
            type="button"
            onClick={changePassword}
            disabled={
              passwordLoading ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            className="bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900"
          >
            {passwordLoading ? "Updating…" : "Update password"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-red-700 dark:text-red-400">
          Danger zone
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Permanently delete your account and all associated data.
        </p>
        <div className="mt-4 space-y-4">
          <input
            type="password"
            placeholder="Enter password to confirm deletion"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
          {deleteMsg && (
            <p className="text-sm text-red-600 dark:text-red-400">{deleteMsg}</p>
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={deleteAccount}
            disabled={deleteLoading || !deletePassword}
          >
            {deleteLoading ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </div>
    </div>
  );
}