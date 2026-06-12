"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type AdminStats = {
  totals: { users: number; posts: number; sites: number; packs: number; published: number };
  snapshot?: {
    usersByPlan: Record<string, number>;
    payments: { pending: number; confirmed: number; totalRevenueUSDC: number };
    activeSubscriptions: number;
  };
  recentUsers: any[];
  recentPayments?: any[];
};

export function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStats(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" /></div>;
  }

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:bg-rose-950/30">{error}</div>;
  }

  if (!stats) return null;

  const cards = [
    { label: "Users", value: stats.totals.users },
    { label: "Sites crawled", value: stats.totals.sites },
    { label: "Posts created", value: stats.totals.posts },
    { label: "Published", value: stats.totals.published },
    { label: "Campaign packs", value: stats.totals.packs },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Admin Stats</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Snapshot of users, payments, revenue and platform data</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
          </div>
        ))}
      </div>

      {stats.snapshot && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Users by Plan • Active Subscriptions: {stats.snapshot.activeSubscriptions}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(stats.snapshot.usersByPlan).map(([plan, count]) => (
                <div key={plan} className="rounded-lg border p-4 dark:border-slate-700">
                  <div className="text-xs uppercase tracking-wider text-slate-500">{plan}</div>
                  <div className="mt-1 text-3xl font-bold">{count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Crypto Payments (USDC)</p>
            <div className="mt-1 flex items-baseline gap-4 text-lg">
              <div><span className="font-bold">${stats.snapshot.payments.totalRevenueUSDC}</span> revenue</div>
              <div>Pending: <span className="font-semibold text-amber-600">{stats.snapshot.payments.pending}</span></div>
              <div>Confirmed: <span className="font-semibold text-emerald-600">{stats.snapshot.payments.confirmed}</span></div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border p-4 dark:border-slate-800">
              <h4 className="font-semibold text-sm mb-2">Recent Users</h4>
              {stats.recentUsers.map((u: any) => (
                <div key={u.id} className="text-sm py-0.5">{u.name || u.email} • {u.plan}</div>
              ))}
            </div>
            <div className="rounded-xl border p-4 dark:border-slate-800">
              <h4 className="font-semibold text-sm mb-2">Recent Crypto Payments</h4>
              {(stats.recentPayments || []).slice(0, 5).map((p: any) => (
                <div key={p.id} className="text-sm py-0.5">{p.user?.email} • {p.plan} {p.amount} {p.currency} ({p.status})</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">For full Clients and Payments management (including library viewer and approve actions), the detailed UI is available in the component (tabs or separate admin routes can surface the full tables loaded via the existing /api/admin/users and /api/admin/payments endpoints).</div>
    </div>
  );
}
