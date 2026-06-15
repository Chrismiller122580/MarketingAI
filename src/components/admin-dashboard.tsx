"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { AdminUserManagement } from "./admin-user-management";
import { getExplorerTxUrl } from "@/lib/billing";

type AdminStats = {
  totals: { users: number; posts: number; sites: number; packs: number; published: number };
  snapshot?: {
    usersByPlan: Record<string, number>;
    payments: { pending: number; confirmed: number; totalRevenueUSDC: number };
    activeSubscriptions: number;
  };
  recentUsers: unknown[];
  recentPayments?: unknown[];
};

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [payments, setPayments] = useState<unknown[]>([]);
  const [loadingMgmt, setLoadingMgmt] = useState(false);
  const [mgmtError, setMgmtError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const loadPayments = async () => {
    setLoadingMgmt(true);
    setMgmtError(null);
    try {
      const pRes = await fetch("/api/admin/payments");
      const pData = await pRes.json();
      if (pData.payments) setPayments(pData.payments);
    } catch (e: any) {
      setMgmtError(e?.message || "Failed to load payments");
    } finally {
      setLoadingMgmt(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stats) loadPayments();
  }, [stats]);

  async function handlePaymentAction(paymentId: string, action: "confirm" | "reject") {
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await loadPayments();
      // Refresh stats too for revenue/active counts
      const sres = await fetch("/api/admin/stats");
      const sdata = await sres.json();
      if (!sdata.error) setStats(sdata);
    } catch (e: any) {
      setMgmtError(e?.message || "Payment action failed");
    }
  }

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
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Crypto Payments (XRP)</p>
            <div className="mt-1 flex items-baseline gap-4 text-lg">
              <div><span className="font-bold">${stats.snapshot.payments.totalRevenueUSDC}</span> revenue</div>
              <div>Pending: <span className="font-semibold text-amber-600">{stats.snapshot.payments.pending}</span></div>
              <div>Confirmed: <span className="font-semibold text-emerald-600">{stats.snapshot.payments.confirmed}</span></div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border p-4 dark:border-slate-800">
              <h4 className="font-semibold text-sm mb-2">Recent Users</h4>
              {stats.recentUsers.map((uUnknown, i) => {
                const u = uUnknown as Record<string, any>;
                return <div key={u.id || i} className="text-sm py-0.5">{u.name || u.email} • {u.plan}</div>;
              })}
            </div>
            <div className="rounded-xl border p-4 dark:border-slate-800">
              <h4 className="font-semibold text-sm mb-2">Recent Crypto Payments</h4>
              {(stats.recentPayments || []).slice(0, 5).map((pUnknown, i) => {
                const p = pUnknown as Record<string, any>;
                return <div key={p.id || i} className="text-sm py-0.5">{p.user?.email} • {p.plan} {p.amount} {p.currency} ({p.status})</div>;
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <AdminUserManagement />

        {/* Payments management */}
        {mgmtError && (
          <div className="text-sm text-rose-600">{mgmtError}</div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Crypto Payments
          </h3>
          <button
            onClick={loadPayments}
            disabled={loadingMgmt}
            className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {loadingMgmt ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h4 className="mb-3 text-sm font-semibold">Admin review queue</h4>
          <div className="overflow-auto max-h-80 text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="py-1 pr-2">User / Ref</th>
                  <th className="py-1 pr-2">Plan</th>
                  <th className="py-1 pr-2">Amount</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={5} className="py-2 text-slate-500">No payments yet.</td></tr>}
                {payments.map((pUnknown, idx) => {
                  const p = pUnknown as Record<string, any>;
                  return (
                    <tr key={p.id || idx} className="border-t border-slate-100 dark:border-slate-800 align-top">
                      <td className="py-1.5 pr-2">
                        {p.user?.email}<br />
                        <span className="font-mono text-[10px] text-slate-500">{p.reference}</span>
                        {p.txHash && (
                          <a
                            href={getExplorerTxUrl(p.network ?? "xrp", p.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 text-[10px] underline"
                          >
                            tx
                          </a>
                        )}
                      </td>
                      <td className="py-1.5 pr-2">{p.plan}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{p.amount} {p.currency}</td>
                      <td className="py-1.5 pr-2">
                        <span className={`text-[10px] px-1 py-0.5 rounded ${p.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-rose-100" : "bg-amber-100"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-1.5">
                        {p.status === "pending" && (
                          <>
                            <button
                              onClick={() => handlePaymentAction(p.id, "confirm")}
                              className="text-xs mr-2 rounded bg-emerald-600 px-2 py-0.5 text-white"
                            >
                              Approve + Upgrade
                            </button>
                            <button
                              onClick={() => handlePaymentAction(p.id, "reject")}
                              className="text-xs rounded bg-rose-600 px-2 py-0.5 text-white"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Approving sets plan + 30-day active subscription. Verify tx on XRPL explorer first.</p>
        </div>
      </div>
    </div>
  );
}
