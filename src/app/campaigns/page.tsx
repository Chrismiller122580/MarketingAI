import { AppShell } from "@/components/app-shell";
import { CampaignPack } from "@/components/campaign-pack";
import { CampaignsTable } from "@/components/campaigns-table";
import { ContentCalendar } from "@/components/content-calendar";
import { ContentStrategyPanel } from "@/components/content-strategy-panel";

export default function CampaignsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <ContentStrategyPanel />
        <CampaignPack />
        <ContentCalendar />
        <CampaignsTable />
      </div>
    </AppShell>
  );
}
