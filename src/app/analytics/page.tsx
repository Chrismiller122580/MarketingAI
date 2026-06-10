import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { StatsCards } from "@/components/stats-cards";
import { BrandInsights } from "@/components/brand-insights";
import { SiteImagesPanel } from "@/components/site-images-panel";
import { SitePagesPanel } from "@/components/site-pages-panel";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <DomainInput />
        <StatsCards />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <BrandInsights />
          <SiteImagesPanel />
        </div>
        <SitePagesPanel />
      </div>
    </AppShell>
  );
}