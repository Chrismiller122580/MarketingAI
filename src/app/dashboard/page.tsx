import { AppShell } from "@/components/app-shell";
import { ContentStrategyPanel } from "@/components/content-strategy-panel";
import { DomainInput } from "@/components/domain-input";
import { QuickActions } from "@/components/quick-actions";
import { StatsCards } from "@/components/stats-cards";
import { ContentCalendar } from "@/components/content-calendar";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <DomainInput />
        <QuickActions />
        <StatsCards />
        <ContentStrategyPanel />
        <ContentCalendar />
      </div>
    </AppShell>
  );
}