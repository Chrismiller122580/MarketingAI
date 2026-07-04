"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  PLAN_DISPLAY,
  PRICING,
  STRIPE_PRICING,
  getExplorerTxUrl,
  getNetworkLabel,
  getReceiverAddress,
  isXrpNetwork,
  type PlanKey,
} from "@/lib/billing";
import { InlineLoading } from "./loading-indicator";
import {
  connectXrpWallet,
  detectXrpWallets,
  sendXrpPayment,
  type DetectedWallets,
  type XrpWalletSession,
} from "@/lib/xrp-wallet";

type PaymentRecord = {
  id: string;
  plan: string;
  amount: string;
  currency: string;
  network: string;
  provider?: string;
  txHash: string | null;
  reference: string | null;
  status: string;
  confirmedAt: string | null;
  createdAt: string;
};

export function BillingPanel() {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;

  const currentPlan = (user?.plan as string) || "free";
  const subStatus = user?.subscriptionStatus as string | null;
  const endsAt = user?.subscriptionEndsAt
    ? new Date(user.subscriptionEndsAt as string)
    : null;

  const [showModal, setShowModal] = useState<PlanKey | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [payDetails, setPayDetails] = useState<Record<string, unknown> | null>(null);
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myPayments, setMyPayments] = useState<PaymentRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [detectedWallets, setDetectedWallets] = useState<DetectedWallets | null>(null);
  const [walletSession, setWalletSession] = useState<XrpWalletSession | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletPaying, setWalletPaying] = useState(false);
  const [stripeLoading, setStripeLoading] = useState<PlanKey | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [hasStripeSub, setHasStripeSub] = useState(false);

  const isPaid = currentPlan !== "free";
  const receiver = getReceiverAddress();
  const currentDisplay = PLAN_DISPLAY[currentPlan] || PLAN_DISPLAY.free;
  const isXrp = isXrpNetwork((payDetails?.network as string) ?? PRICING.pro.network);

  useEffect(() => {
    if (!showModal || !isXrp) return;
    detectXrpWallets()
      .then(setDetectedWallets)
      .catch(() => setDetectedWallets({ crossmark: false, gem: false }));
  }, [showModal, isXrp]);

  useEffect(() => {
    fetch("/api/billing/stripe/status")
      .then((r) => r.json())
      .then((data) => {
        setStripeConfigured(!!data.stripeConfigured);
        setHasStripeSub(!!data.stripeSubscriptionId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "success") {
      updateSession().then(() => {
        setMessage("Stripe subscription active! Your plan has been upgraded.");
        window.history.replaceState({}, "", "/billing");
        fetch("/api/billing/stripe/status")
          .then((r) => r.json())
          .then((data) => {
            setStripeConfigured(!!data.stripeConfigured);
            setHasStripeSub(!!data.stripeSubscriptionId);
          })
          .catch(() => {});
      });
    } else if (params.get("stripe") === "cancelled") {
      Promise.resolve().then(() => {
        setMessage("Checkout cancelled. You can try again anytime.");
      });
      window.history.replaceState({}, "", "/billing");
    }
  }, [updateSession]);

  async function startStripeCheckout(plan: PlanKey) {
    setStripeLoading(plan);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stripe checkout failed");
    } finally {
      setStripeLoading(null);
    }
  }

  async function openStripePortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Portal failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  async function openPay(plan: PlanKey) {
    setError(null);
    setMessage(null);
    setTxHash("");
    setWalletSession(null);
    setDetectedWallets(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start payment");
    }
  }

  async function submitProof(hashOverride?: string) {
    const hash = (hashOverride ?? txHash).trim();
    if (!reference || !hash) {
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
          txHash: hash,
          network: payDetails?.network,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setMessage(data.message || "Payment submitted for review.");
      setTxHash("");
      setWalletSession(null);
      setShowModal(null);

      await updateSession();
      await loadMyPayments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit proof");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadMyPayments() {
    try {
      const res = await fetch("/api/billing/crypto/mine");
      const data = await res.json();
      if (res.ok && data.payments) {
        setMyPayments(data.payments);
      }
    } catch {
      /* ignore */
    }
  }

  function closeModal() {
    setShowModal(null);
    setReference(null);
    setPayDetails(null);
    setTxHash("");
    setWalletSession(null);
    setDetectedWallets(null);
    setError(null);
  }

  async function handleConnectWallet() {
    setWalletConnecting(true);
    setError(null);
    try {
      const sessionWallet = await connectXrpWallet();
      setWalletSession(sessionWallet);
      setMessage(`Connected: ${sessionWallet.address.slice(0, 8)}…${sessionWallet.address.slice(-6)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection failed");
    } finally {
      setWalletConnecting(false);
    }
  }

  async function handleWalletPay() {
    if (!walletSession || !payDetails || !reference) return;

    setWalletPaying(true);
    setError(null);
    setMessage(null);

    try {
      const amount = Number(payDetails.amount);
      const plan = String(payDetails.plan ?? showModal ?? "pro");

      const { hash } = await sendXrpPayment(walletSession, {
        destination: receiver,
        amountXrp: amount,
        reference,
        description: `CrawlSpark ${plan} subscription`,
      });

      setTxHash(hash);
      setMessage("Payment sent. Submitting proof…");
      await submitProof(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet payment failed");
    } finally {
      setWalletPaying(false);
    }
  }

  const walletAvailable =
    detectedWallets?.crossmark || detectedWallets?.gem || false;

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </div>
      )}
      {error && !showModal && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Current Plan
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${currentDisplay.color}`}
              >
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
                Upgrade to unlock crawl, generation, and publishing.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={loadMyPayments}
            className="text-xs text-amber-600 hover:underline"
          >
            View my payments
          </button>
        </div>

        {hasStripeSub && (
          <button
            type="button"
            onClick={openStripePortal}
            disabled={portalLoading}
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {portalLoading ? (
              <InlineLoading label="Opening portal…" />
            ) : (
              "Manage Stripe subscription"
            )}
          </button>
        )}

        {!isPaid && (
          <div className="mt-6 grid gap-4 lg:grid-cols-3 sm:grid-cols-2">
            {(["pro", "enterprise", "enterprise_plus"] as const).map((planKey) => {
              const crypto = PRICING[planKey];
              const stripe = STRIPE_PRICING[planKey];
              return (
                <div
                  key={planKey}
                  className="rounded-xl border border-slate-200 p-5 dark:border-slate-700"
                >
                  <div className="text-lg font-semibold">{crypto.label}</div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <div className="text-2xl font-bold tracking-tighter">
                      ${stripe.amount}
                      <span className="text-sm font-normal text-slate-500">/mo</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      or {crypto.amount} {crypto.currency}/mo
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {crypto.description}
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {stripeConfigured && (
                      <button
                        type="button"
                        onClick={() => startStripeCheckout(planKey)}
                        disabled={!!stripeLoading}
                        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                      >
                        {stripeLoading === planKey ? (
                          <InlineLoading label="Redirecting to Stripe…" />
                        ) : (
                          "Subscribe with card"
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openPay(planKey)}
                      className="w-full rounded-xl bg-gradient-to-r from-crawl-700 to-spark-500 px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105 active:brightness-95"
                    >
                      Pay with XRP
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isPaid && !hasStripeSub && (
          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Thank you for being a {currentDisplay.label} customer. Renew with XRP
            before your subscription ends.
          </div>
        )}

        {isPaid && hasStripeSub && (
          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Your {currentDisplay.label} plan renews automatically via Stripe.
          </div>
        )}
      </div>

      {myPayments.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold">Your recent payments</h3>
          <div className="space-y-2 text-sm">
            {myPayments.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs dark:border-slate-700"
              >
                <div>
                  <span className="font-medium">{p.plan}</span> • {p.amount}{" "}
                  {p.currency}
                  {p.provider === "stripe" ? (
                    <span className="text-slate-500"> via Stripe</span>
                  ) : (
                    <span> on {getNetworkLabel(p.network)}</span>
                  )}
                  {p.reference && (
                    <div className="text-[10px] text-slate-400">Ref: {p.reference}</div>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`rounded px-2 py-0.5 ${
                      p.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : p.status === "rejected"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.txHash && (
                    <a
                      href={getExplorerTxUrl(p.network, p.txHash)}
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

      {showModal && payDetails && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold">
              Pay for {String(payDetails.plan)} with {String(payDetails.currency)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Connect your XRP wallet or send manually, then submit proof.
            </p>

            <div className="mt-6 rounded-xl border bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-950">
              <div className="font-mono text-2xl font-semibold tracking-tighter">
                {String(payDetails.amount)} {String(payDetails.currency)}
              </div>
              <div className="mt-1 text-xs uppercase text-slate-500">
                on {getNetworkLabel(String(payDetails.network))}
              </div>

              <div className="mt-4">
                <div className="mb-1 text-xs text-slate-500">Send to this address</div>
                <div className="select-all break-all rounded border bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-900">
                  {receiver}
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(receiver)}
                  className="mt-1 text-xs text-amber-600 hover:underline"
                >
                  Copy address
                </button>
              </div>

              <div className="mt-4 text-xs">
                <strong>Reference:</strong>
                <br />
                <span className="font-mono">{reference}</span>
              </div>
            </div>

            {isXrp && (
              <div className="mt-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  XRP Wallet
                </div>

                {!walletAvailable && detectedWallets && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Install{" "}
                    <a
                      href="https://crossmark.io"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-700 underline"
                    >
                      Crossmark
                    </a>{" "}
                    or{" "}
                    <a
                      href="https://gemwallet.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-700 underline"
                    >
                      Gem Wallet
                    </a>{" "}
                    to pay in one click.
                  </p>
                )}

                {walletSession ? (
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    Connected ({walletSession.provider}):{" "}
                    <span className="font-mono">{walletSession.address}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={walletConnecting || !walletAvailable}
                    className="w-full rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200"
                  >
                    {walletConnecting
                      ? "Connecting…"
                      : walletAvailable
                        ? "Connect XRP Wallet"
                        : "No wallet detected"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleWalletPay}
                  disabled={!walletSession || walletPaying || submitting}
                  className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {walletPaying
                    ? "Confirm in wallet…"
                    : `Pay ${String(payDetails.amount)} XRP now`}
                </button>
              </div>
            )}

            <div className="mt-6">
              <label className="mb-1 block text-sm font-medium">
                Transaction hash (manual payment)
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="64-character XRPL hash"
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Auto-filled after wallet payment, or paste from XRPL explorer.
              </p>
            </div>

            {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
            {message && <div className="mt-3 text-sm text-emerald-600">{message}</div>}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-lg border py-2 text-sm dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitProof()}
                disabled={submitting || !txHash.trim()}
                className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit payment proof"}
              </button>
            </div>

            <p className="mt-4 text-center text-[10px] text-slate-400">
              Valid XRP payments auto-activate your plan. Otherwise an admin will verify shortly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}