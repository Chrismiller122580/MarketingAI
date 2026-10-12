import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { QuickActions } from "@/components/quick-actions";
import { DashboardInfluencers } from "@/components/dashboard-influencers";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { FirstRunChecklist } from "@/components/first-run-checklist";
import { ThisWeekPack } from "@/components/this-week-pack";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="min-w-0 space-y-8">
        <Suspense>
          <EmailVerificationBanner />
        </Suspense>
        <FirstRunChecklist />
        <DomainInput variant="dashboard" />
        <ThisWeekPack />
        <DashboardInfluencers />
        <QuickActions />
      </div>
    </AppShell>
  );
}
