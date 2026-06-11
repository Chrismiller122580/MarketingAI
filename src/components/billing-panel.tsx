"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PLAN_DISPLAY, PRICING, getExplorerTxUrl, getNetworkLabel, getReceiverAddress, type PlanKey } from "@/lib/billing";

type PaymentRecord = {
  id: string;
  plan: string;
  amount: string;
  currency: string;
  network: string;
  txHash: string | null;
  reference: string;
  status: string;
  confirmedAt: string | null;
  createdAt: string;
};

export function BillingPanel() {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as any;

  const currentPlan = (user?.plan || "free") as string;
  const subStatus = user?.subscriptionStatus as string | null;
  const endsAt = user?.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;

  const [showModal, setShowModal] = useState<PlanKey | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [payDetails, setPayDetails] = useState<any>(null);
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myPayments, setMyPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPaid = currentPlan !== "free";
  const isActive = subStatus === "active" || !subStatus;

  async function openPay(plan: PlanKey) {
    setError(null);
    setMessage(null);
    setTxHash("");
    setShowModal(plan);
    setReference(null);
    setPayDetails(null);

    try {
      const res = await fetch("/api/billing/crypto/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payment intent");

      setReference(data.payment.reference);
      setPayDetails(data.payment);
    } catch (e: any) {
      setError(e.message || "Failed to start payment");
    }
  }

  async function submitProof() {
    if (!reference || !txHash.trim()) {
      setError("Please enter the transaction hash");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/crypto/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          txHash: txHash.trim(),
          network: payDetails?.network,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setMessage(data.message || "Payment submitted for review.");
      setTxHash("");
      setShowModal(null);

      // Refresh session + payments list so user sees updated status eventually
      await updateSession();
      await loadMyPayments();
    } catch (e: any) {
      setError(e.message || "Failed to submit proof");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadMyPayments() {
    setLoadingPayments(true);
    try {
      const res = await fetch("/api/billing/crypto/mine");
      const data = await res.json();
      if (res.ok && data.payments) {
        setMyPayments(data.payments);
      }
    } catch {}
    setLoadingPayments(false);
  }

  function closeModal() {
    setShowModal(null);
    setReference(null);
    setPayDetails(null);
    setTxHash("");
    setError(null);
  }

  const receiver = getReceiverAddress();
  const currentDisplay = PLAN_DISPLAY[currentPlan] || PLAN_DISPLAY.free;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Current Plan</h2>
            <div className="mt-2 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${currentDisplay.color}`}>
                {currentDisplay.label}
              </span>
              {subStatus && (
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {subStatus}
                </span>
              )}
            </div>
            {endsAt && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Active until {endsAt.toLocaleDateString()}
              </p>
            )}
            {!isPaid && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Upgrade to unlock higher limits and priority features.
              </p>
            )}
          </div>

          <button
            onClick={loadMyPayments}
            className="text-xs text-amber-600 hover:underline"
          >
            View my payments
          </button>
        </div>

        {!isPaid && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(["pro", "enterprise"] as const).map((planKey) => {
              const p = PRICING[planKey];
              return (
                <div key={planKey} className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-lg font-semibold">{p.label}</div>
                      <div className="text-3xl font-bold tracking-tighter">
                        ${p.amount}
                        <span className="text-base font-normal text-slate-500">/mo</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-emerald-600 dark:text-emerald-400">Crypto only</div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
                  <button
                    onClick={() => openPay(planKey)}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-crawl-700 to-spark-500 px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105 active:brightness-95"
                  >
                    Pay with USDC (Crypto)
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {isPaid && (
          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Thank you for being a {currentDisplay.label} customer. Renew by paying crypto again before your subscription ends.
          </div>
        )}
      </div>

      {/* Recent crypto payments for this user */}
      {myPayments.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Your recent crypto payments</h3>
          <div className="space-y-2 text-sm">
            {myPayments.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs dark:border-slate-700">
                <div>
                  <span className="font-medium">{p.plan}</span> • {p.amount} {p.currency} on {getNetworkLabel(p.network as any)}
                  <div className="text-[10px] text-slate-400">Ref: {p.reference}</div>
                </div>
                <div className="text-right">
                  <span className={`rounded px-2 py-0.5 ${p.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {p.status}
                  </span>
                  {p.txHash && (
                    <a
                      href={getExplorerTxUrl(p.network as any, p.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-amber-600 hover:underline"
                    >
                      View tx
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pay with Crypto Modal */}
      {showModal && payDetails && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={closeModal}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold">Pay for {payDetails.plan} with Crypto</h3>
            <p className="mt-1 text-sm text-slate-500">Send the exact amount below. Then submit your transaction hash.</p>

            <div className="mt-6 rounded-xl border p-4 text-sm dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
              <div className="font-mono text-2xl font-semibold tracking-tighter">
                {payDetails.amount} {payDetails.currency}
              </div>
              <div className="mt-1 text-xs uppercase text-slate-500">on {getNetworkLabel(payDetails.network)}</div>

              <div className="mt-4">
                <div className="text-xs text-slate-500 mb-1">Send to this address</div>
                <div className="font-mono break-all rounded bg-white p-3 text-sm border dark:bg-slate-900 dark:border-slate-700 select-all">
                  {receiver}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(receiver)}
                  className="mt-1 text-xs text-amber-600 hover:underline"
                >
                  Copy address
                </button>
              </div>

              <div className="mt-4 text-xs">
                <strong>Reference (note for your records):</strong><br />
                <span className="font-mono">{reference}</span>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium mb-1">Transaction hash (after you send)</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <p className="mt-1 text-[10px] text-slate-400">Paste the full tx hash from your wallet or explorer.</p>
            </div>

            {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
            {message && <div className="mt-3 text-sm text-emerald-600">{message}</div>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-lg border py-2 text-sm dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={submitProof}
                disabled={submitting || !txHash.trim()}
                className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit payment proof"}
              </button>
            </div>

            <p className="mt-4 text-center text-[10px] text-slate-400">
              Your plan will be activated after an admin reviews the on-chain transaction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
