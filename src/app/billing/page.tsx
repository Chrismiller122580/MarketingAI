import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BillingPanel } from "@/components/billing-panel";

export default function BillingPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Billing &amp; Payments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Subscribe with card via Stripe or pay with XRP. Manage your plan and view payment history.
          </p>
        </div>

        <BillingPanel />

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-400 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">How billing works</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Card (Stripe):</strong> Click “Subscribe with card” — checkout opens on Stripe. Your plan renews monthly and syncs automatically.</li>
            <li><strong>XRP:</strong> Click “Pay with XRP”, connect Crossmark or Gem Wallet, or send manually and submit the transaction hash.</li>
            <li>Valid XRP payments auto-activate for 30 days; others are reviewed by an admin.</li>
            <li>Stripe subscribers can manage or cancel via “Manage Stripe subscription”.</li>
            <li>Your current plan and end date are shown above.</li>
          </ul>
          <p className="mt-3 text-xs">Questions? Contact support from your account or the admin team.</p>
        </div>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </div>
      </div>
    </AppShell>
  );
}
