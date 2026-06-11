"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import type { SavedPost } from "@/lib/types";

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

type AdminStats = {
  totals: {
    users: number;
    posts: number;
    sites: number;
    packs: number;
    published: number;
  };
  recentUsers: AdminUser[];
};

type LibraryData = {
  user: { id: string; name: string | null; email: string };
  posts: SavedPost[];
  sites: Array<{ id: string; domain: string; crawledAt: string; pageCount: number }>;
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  pro: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  enterprise: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trialing: "bg-sky-100 text-sky-700",
  past_due: "bg-rose-100 text-rose-700",
  canceled: "bg-slate-200 text-slate-600",
};

export function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Full clients search
  const [search, setSearch] = useState("");

  // Library viewer (modal) — "see all users libraries"
  const [libraryUserId, setLibraryUserId] = useState<string | null>(null);
  const [libraryData, setLibraryData] = useState<LibraryData | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Crypto payments (admin)
  const [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStats(data);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  const loadAllUsers = useCallback(async (currentSearch = "") => {
    setClientsLoading(true);
    try {
      const url = currentSearch
        ? `/api/admin/users?search=${encodeURIComponent(currentSearch)}`
        : "/api/admin/users";
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAllUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
    loadAllUsers();
    loadAdminPayments();
  }, [loadStats, loadAllUsers]);

  // Debounced search for clients
  useEffect(() => {
    const t = setTimeout(() => {
      loadAllUsers(search);
    }, 250);
    return () => clearTimeout(t);
  }, [search, loadAllUsers]);

  async function updateUserField(userId: string, field: string, value: string | null) {
    setUpdatingId(userId);
    setError(null);
    try {
      const payload: any = {};
      if (field === "role") payload.role = value;
      if (field === "plan") payload.plan = value;
      if (field === "subscriptionStatus") payload.subscriptionStatus = value;

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Update failed");

      const updated = data.user;

      setStats((prev) =>
        prev
          ? {
              ...prev,
              recentUsers: prev.recentUsers.map((u) =>
                u.id === userId ? { ...u, ...updated } : u,
              ),
            }
          : prev,
      );

      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)),
      );

      if (libraryUserId === userId && libraryData) {
        setLibraryData((prev) =>
          prev ? { ...prev, user: { ...prev.user, ...updated } } : prev,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  async function openLibrary(userId: string) {
    setLibraryUserId(userId);
    setLibraryData(null);
    setLibraryError(null);
    setLibraryLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/posts`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLibraryData(data);
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : "Failed to load user library");
    } finally {
      setLibraryLoading(false);
    }
  }

  function closeLibrary() {
    setLibraryUserId(null);
    setLibraryData(null);
    setLibraryError(null);
    setDeletingPostId(null);
  }

  async function deleteUserPost(userId: string, postId: string) {
    if (!confirm("Remove this post from the user's library?")) return;

    setDeletingPostId(postId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/posts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");

      setLibraryData((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.filter((p) => p.id !== postId),
            }
          : prev,
      );

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, _count: { ...u._count, posts: Math.max(0, u._count.posts - 1) } }
            : u,
        ),
      );
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setDeletingPostId(null);
    }
  }

  async function loadAdminPayments() {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const res = await fetch("/api/admin/payments");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load payments");
      setAdminPayments(data.payments || []);
    } catch (err: any) {
      setPaymentsError(err.message);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function actOnPayment(paymentId: string, action: "confirm" | "reject") {
    if (action === "confirm" && !confirm("Confirm this crypto payment and upgrade the user?")) return;

    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      // Refresh lists
      await loadAdminPayments();
      await loadAllUsers(search);
      if (stats) loadStats();
      alert(data.message || "Done");
    } catch (err: any) {
      alert(err.message);
    }
  }

  const displayedUsers = useMemo(() => {
    if (!search) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.plan.toLowerCase().includes(q),
    );
  }, [allUsers, search]);

  const cards = stats
    ? [
        { label: "Users", value: stats.totals.users },
        { label: "Sites crawled", value: stats.totals.sites },
        { label: "Posts created", value: stats.totals.posts },
        { label: "Published", value: stats.totals.published },
        { label: "Campaign packs", value: stats.totals.packs },
      ]
    : [];

  if (loading && !stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error && !stats && allUsers.length === 0) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
        {error}
        <button onClick={loadStats} className="ml-3 underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Full Clients table — view all users, manage subscriptions + roles, access libraries */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              All Clients ({allUsers.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Full user directory. Search, manage plans/subscriptions, roles, and open any client&apos;s library.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, plan..."
              className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              onClick={() => loadAllUsers(search)}
              disabled={clientsLoading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {clientsLoading ? "..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 sm:px-6">Client</th>
                <th className="px-4 py-3 sm:px-6">Plan</th>
                <th className="px-4 py-3 sm:px-6">Subscription</th>
                <th className="px-4 py-3 sm:px-6">Role</th>
                <th className="px-3 py-3 text-center sm:px-4">Sites</th>
                <th className="px-3 py-3 text-center sm:px-4">Posts</th>
                <th className="px-3 py-3 text-center sm:px-4">Packs</th>
                <th className="px-4 py-3 sm:px-6">Joined</th>
                <th className="px-4 py-3 sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-500">
                    {clientsLoading ? "Loading clients..." : "No matching clients found."}
                  </td>
                </tr>
              )}

              {displayedUsers.map((user) => {
                const isSelf = user.id === session?.user?.id;
                const isUpdating = updatingId === user.id;
                const planClass = PLAN_COLORS[user.plan] ?? PLAN_COLORS.free;
                const statusClass = user.subscriptionStatus
                  ? STATUS_COLORS[user.subscriptionStatus] ?? "bg-slate-100 text-slate-600"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800";

                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 sm:px-6">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {user.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </td>

                    <td className="px-4 py-3 sm:px-6">
                      <select
                        value={user.plan}
                        disabled={isUpdating || isSelf}
                        onChange={(e) => updateUserField(user.id, "plan", e.target.value)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${planClass} disabled:opacity-60`}
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="enterprise">enterprise</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 sm:px-6">
                      <div className="flex flex-col gap-1 text-xs">
                        <select
                          value={user.subscriptionStatus ?? ""}
                          disabled={isUpdating}
                          onChange={(e) =>
                            updateUserField(user.id, "subscriptionStatus", e.target.value || null)
                          }
                          className={`w-fit rounded px-2 py-0.5 text-[10px] font-medium ${statusClass}`}
                        >
                          <option value="">—</option>
                          <option value="active">active</option>
                          <option value="trialing">trialing</option>
                          <option value="past_due">past_due</option>
                          <option value="canceled">canceled</option>
                        </select>
                        {user.subscriptionEndsAt && (
                          <span className="text-[10px] text-slate-400">
                            ends {new Date(user.subscriptionEndsAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 sm:px-6">
                      {isSelf ? (
                        <span className="text-xs text-slate-400">You (admin)</span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={isUpdating}
                          onChange={(e) => updateUserField(user.id, "role", e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>

                    <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300 sm:px-4">
                      {user._count.sites}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300 sm:px-4">
                      {user._count.posts}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300 sm:px-4">
                      {user._count.packs}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 sm:px-6">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3 sm:px-6">
                      <button
                        onClick={() => openLibrary(user.id)}
                        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        View library
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Full client directory with live subscription &amp; plan management. Click &ldquo;View library&rdquo; to inspect any user&apos;s posts and sites.
        </div>
      </div>

      {/* Crypto Payments - Admin review & approval */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold">Crypto Payments</h2>
            <p className="text-xs text-slate-500">Review on-chain payments and approve plan upgrades.</p>
          </div>
          <button
            onClick={loadAdminPayments}
            disabled={paymentsLoading}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700"
          >
            {paymentsLoading ? "Loading..." : "Load / Refresh Payments"}
          </button>
        </div>

        {paymentsError && (
          <div className="px-6 py-3 text-sm text-rose-600">{paymentsError}</div>
        )}

        {adminPayments.length > 0 ? (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b dark:border-slate-800">
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Network / Tx</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminPayments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                    <td className="px-4 py-3 text-xs">
                      {p.user?.name || p.user?.email}<br />
                      <span className="text-[10px] text-slate-400">{p.reference}</span>
                    </td>
                    <td className="px-4 py-3 capitalize text-xs font-medium">{p.plan}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.amount} {p.currency}</td>
                    <td className="px-4 py-3 text-xs">
                      {p.network}
                      {p.txHash && (
                        <a href={`https://${p.network === "base" ? "basescan" : "etherscan"}.org/tx/${p.txHash}`} target="_blank" className="ml-1 text-amber-600 hover:underline">view</a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs">
                      {p.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => actOnPayment(p.id, "confirm")} className="text-emerald-600 hover:underline">Approve + Upgrade</button>
                          <button onClick={() => actOnPayment(p.id, "reject")} className="text-rose-600 hover:underline">Reject</button>
                        </div>
                      )}
                      {p.status !== "pending" && <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-sm text-slate-500 text-center">
            No crypto payments yet. Users can pay from Settings → Billing.
          </div>
        )}
      </div>

      {/* User Library Modal */}
      {libraryUserId && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-10"
          onClick={closeLibrary}
        >
          <div
            className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-800">
              <div>
                <div className="text-sm uppercase tracking-wider text-slate-500">Client Library</div>
                <div className="text-xl font-semibold">
                  {libraryData?.user.name ?? libraryData?.user.email ?? "Loading..."}
                </div>
                <div className="text-sm text-slate-500">{libraryData?.user.email}</div>
              </div>
              <button
                onClick={closeLibrary}
                className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            {libraryData && libraryData.sites.length > 0 && (
              <div className="border-b px-6 py-3 dark:border-slate-800">
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Crawled sites ({libraryData.sites.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {libraryData.sites.slice(0, 6).map((s) => (
                    <div key={s.id} className="rounded-lg border px-3 py-1 text-xs dark:border-slate-700">
                      {s.domain} <span className="text-slate-400">· {s.pageCount} pages</span>
                    </div>
                  ))}
                  {libraryData.sites.length > 6 && (
                    <div className="rounded-lg border px-3 py-1 text-xs text-slate-400 dark:border-slate-700">
                      +{libraryData.sites.length - 6} more
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="max-h-[70vh] overflow-y-auto p-6">
              {libraryLoading && (
                <div className="py-12 text-center text-sm text-slate-500">Loading library…</div>
              )}

              {libraryError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30">
                  {libraryError}
                </div>
              )}

              {libraryData && (
                <>
                  <div className="mb-4 flex items-baseline justify-between">
                    <h3 className="text-base font-semibold">
                      Saved posts ({libraryData.posts.length})
                    </h3>
                    <span className="text-xs text-slate-400">Admin view — posts can be removed</span>
                  </div>

                  {libraryData.posts.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                      This client has no saved posts yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {libraryData.posts.map((post) => {
                        const statusColors: Record<string, string> = {
                          draft: "bg-slate-100 dark:bg-slate-800 text-slate-600",
                          scheduled: "bg-amber-50 text-amber-700",
                          published: "bg-emerald-50 text-emerald-700",
                          failed: "bg-rose-50 text-rose-700",
                        };
                        return (
                          <div
                            key={post.id}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                          >
                            <div className="relative aspect-video bg-slate-100 dark:bg-slate-900">
                              <Image
                                src={post.image.url}
                                alt={post.image.alt}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                              <span
                                className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[post.publishStatus ?? "draft"]}`}
                              >
                                {post.publishStatus ?? "draft"}
                              </span>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium capitalize text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                  {post.platform}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {post.scheduledFor ?? new Date(post.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="mt-2 line-clamp-3 text-sm text-slate-700 dark:text-slate-300">
                                {post.text}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                                <button
                                  onClick={() => navigator.clipboard.writeText(post.text)}
                                  className="font-medium text-amber-600 hover:text-amber-700"
                                >
                                  Copy text
                                </button>
                                <a
                                  href={post.image.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-amber-600 hover:text-amber-700"
                                >
                                  View image
                                </a>
                                <button
                                  onClick={() => deleteUserPost(libraryData.user.id, post.id)}
                                  disabled={deletingPostId === post.id}
                                  className="font-medium text-rose-500 hover:text-rose-600 disabled:opacity-50"
                                >
                                  {deletingPostId === post.id ? "Removing..." : "Remove"}
                                </button>
                              </div>
                              {post.hashtags?.length > 0 && (
                                <div className="mt-2 text-[10px] text-slate-400">
                                  {post.hashtags.slice(0, 4).join(" ")}
                                  {post.hashtags.length > 4 ? " …" : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end border-t px-6 py-3 dark:border-slate-800">
              <button
                onClick={closeLibrary}
                className="rounded-lg border px-4 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Close viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
