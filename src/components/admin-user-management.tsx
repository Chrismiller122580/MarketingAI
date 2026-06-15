"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  subscriptionStatus: string | null;
  subscriptionEndsAt: string | null;
  createdAt: string;
  _count: { posts: number; sites: number; packs: number };
};

type UserPost = {
  id?: string;
  platform: string;
  text: string;
};

const ROLES = ["user", "admin"] as const;
const PLANS = ["free", "pro", "enterprise"] as const;
const STATUSES = ["", "active", "trialing", "past_due", "canceled"] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

function statusLabel(status: string): string {
  if (!status) return "None";
  return status.replace("_", " ");
}

export function AdminUserManagement() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserPosts, setSelectedUserPosts] = useState<UserPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const loadUsers = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      const q = (query ?? "").trim();
      if (q) params.set("search", q);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function updateUser(
    userId: string,
    patch: Record<string, string | null>,
  ) {
    setSavingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      if (data.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u)),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      await loadUsers();
    } finally {
      setSavingId(null);
    }
  }

  async function grantSubscription(userId: string, plan: "pro" | "enterprise") {
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await updateUser(userId, {
      plan,
      subscriptionStatus: "active",
      subscriptionEndsAt: endsAt,
    });
  }

  async function deleteUser(user: AdminUser) {
    const label = user.name || user.email;
    if (
      !window.confirm(
        `Delete ${label}? This permanently removes their account, posts, sites, and settings.`,
      )
    ) {
      return;
    }

    setSavingId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (selectedUserId === user.id) {
        setSelectedUserId(null);
        setSelectedUserPosts([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSavingId(null);
    }
  }

  async function viewUserPosts(userId: string) {
    setSelectedUserId(userId);
    setSelectedUserPosts([]);
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/posts`);
      const data = await res.json();
      if (data.posts) setSelectedUserPosts(data.posts.slice(0, 12));
    } catch {
      setError("Failed to load user posts");
    } finally {
      setLoadingPosts(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            User Management
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Change roles, plans, subscriptions, or remove accounts
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers(search)}
            placeholder="Search name or email…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-56"
          />
          <button
            type="button"
            onClick={() => loadUsers(search)}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {loading ? "…" : "Search"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Plan</th>
              <th className="px-3 py-3 font-medium">Subscription</th>
              <th className="px-3 py-3 font-medium">Content</th>
              <th className="px-3 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Loading users…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const busy = savingId === user.id;

              return (
                <tr
                  key={user.id}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {user.name || "—"}
                      {isSelf && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          you
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>

                  <td className="px-3 py-3">
                    <select
                      value={user.role}
                      disabled={busy || isSelf}
                      onChange={(e) =>
                        updateUser(user.id, { role: e.target.value })
                      }
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                      title={isSelf ? "Cannot change your own role" : undefined}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-3">
                    <select
                      value={user.plan}
                      disabled={busy}
                      onChange={(e) =>
                        updateUser(user.id, { plan: e.target.value })
                      }
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-3">
                    <select
                      value={user.subscriptionStatus ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        updateUser(user.id, {
                          subscriptionStatus: e.target.value || null,
                        })
                      }
                      className="mb-1 block rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {STATUSES.map((s) => (
                        <option key={s || "none"} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-slate-500">
                      Ends {formatDate(user.subscriptionEndsAt)}
                    </div>
                  </td>

                  <td className="px-3 py-3 tabular-nums text-xs text-slate-600 dark:text-slate-400">
                    {user._count.posts} posts
                    <br />
                    {user._count.sites} sites
                  </td>

                  <td className="px-3 py-3 text-xs text-slate-500">
                    {formatDate(user.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => viewUserPosts(user.id)}
                        className="rounded border border-slate-200 px-2 py-0.5 text-[11px] hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Library
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => grantSubscription(user.id, "pro")}
                        className="rounded bg-emerald-600 px-2 py-0.5 text-[11px] text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        +30d Pro
                      </button>
                      <button
                        type="button"
                        disabled={busy || isSelf}
                        onClick={() => deleteUser(user)}
                        className="rounded bg-rose-600 px-2 py-0.5 text-[11px] text-white hover:bg-rose-700 disabled:opacity-50"
                        title={isSelf ? "Cannot delete your own account" : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedUserId && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-slate-900 dark:text-slate-100">
              Post library — {selectedUserId.slice(0, 8)}…
            </strong>
            <button
              type="button"
              onClick={() => {
                setSelectedUserId(null);
                setSelectedUserPosts([]);
              }}
              className="text-xs text-slate-500 underline hover:text-slate-700"
            >
              Close
            </button>
          </div>
          {loadingPosts ? (
            <p className="text-slate-500">Loading posts…</p>
          ) : selectedUserPosts.length === 0 ? (
            <p className="text-slate-500">No posts for this user.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {selectedUserPosts.map((post, idx) => (
                <li key={post.id ?? idx} className="line-clamp-2 text-slate-700 dark:text-slate-300">
                  • [{post.platform}] {post.text?.slice(0, 120)}
                  {post.text?.length > 120 ? "…" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}