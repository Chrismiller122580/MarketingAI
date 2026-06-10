import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { StatsCards } from "@/components/stats-cards";
import { CampaignsTable } from "@/components/campaigns-table";
import { ContentGenerator } from "@/components/content-generator";
import { SitePagesPanel } from "@/components/site-pages-panel";
import { SiteImagesPanel } from "@/components/site-images-panel";

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-8">
        <DomainInput />
        <StatsCards />

        <ContentGenerator />

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <CampaignsTable />
          <SiteImagesPanel />
        </div>

        <SitePagesPanel />
      </div>
    </AppShell>
  );
}