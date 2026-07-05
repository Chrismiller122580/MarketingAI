import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ContentStrategyPanel } from "@/components/content-strategy-panel";
import { DomainInput } from "@/components/domain-input";
import { QuickActions } from "@/components/quick-actions";
import { StatsCards } from "@/components/stats-cards";
import { ContentCalendar } from "@/components/content-calendar";
import { InfluencersPanel } from "@/components/influencers-panel";
import { EmailVerificationBanner } from "@/components/email-verification-banner";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <Suspense>
          <EmailVerificationBanner />
        </Suspense>
        <DomainInput variant="dashboard" />
        <InfluencersPanel />
        <QuickActions />
        <StatsCards />
        <ContentStrategyPanel />
        <ContentCalendar />
      </div>
    </AppShell>
  );
}