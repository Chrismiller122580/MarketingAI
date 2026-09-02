import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { SettingsForm } from "@/components/settings-form";
import { SocialConnections } from "@/components/social-connections";
import { BrandInsights } from "@/components/brand-insights";
import { AccountSettings } from "@/components/account-settings";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Teaser to the dedicated billing page */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Billing &amp; Payments</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View your plan, upgrade with XRP, and see payment history.</p>
            </div>
            <Link
              href="/billing"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Open Billing →
            </Link>
          </div>
        </div>

        <AccountSettings />
        <DomainInput variant="dashboard" />
        <SocialConnections />
        <SettingsForm />
        <BrandInsights />
      </div>
    </AppShell>
  );
}