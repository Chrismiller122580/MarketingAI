import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { CampaignPack } from "@/components/campaign-pack";
import { CampaignsTable } from "@/components/campaigns-table";
import { ContentCalendar } from "@/components/content-calendar";
import { ContentStrategyPanel } from "@/components/content-strategy-panel";

export default function CampaignsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <DomainInput />
        <ContentStrategyPanel />
        <CampaignPack />
        <ContentCalendar />
        <CampaignsTable />
      </div>
    </AppShell>
  );
}