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
            Manage your subscription and view crypto payment history. Pay with XRP via Crossmark or Gem Wallet.
          </p>
        </div>

        <BillingPanel />

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-400 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">How crypto billing works</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Choose Pro or Enterprise and click “Pay with XRP”.</li>
            <li>Connect Crossmark or Gem Wallet and pay in one click, or send manually to the displayed address.</li>
            <li>After the transaction confirms, the tx hash is auto-submitted (or paste it manually).</li>
            <li>An admin will verify on-chain and activate/renew your plan (usually within hours).</li>
            <li>Your current plan and end date are shown above. Renew before expiry to keep access.</li>
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
