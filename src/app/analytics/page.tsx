import { AppShell } from "@/components/app-shell";
import { StatsCards } from "@/components/stats-cards";
import { AnalyticsOverview } from "@/components/analytics-overview";
import { PerformancePanel } from "@/components/performance-panel";
import { BrandInsights } from "@/components/brand-insights";
import { KeptLines } from "@/components/kept-lines";
import { SiteImagesPanel } from "@/components/site-images-panel";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <StatsCards />
        <KeptLines />
        <PerformancePanel />
        <AnalyticsOverview />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <BrandInsights />
          <SiteImagesPanel />
        </div>
      </div>
    </AppShell>
  );
}