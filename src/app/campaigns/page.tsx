import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { CampaignPack } from "@/components/campaign-pack";
import { CampaignsTable } from "@/components/campaigns-table";
import { ContentCalendar } from "@/components/content-calendar";

export default function CampaignsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <DomainInput />
        <CampaignPack />
        <ContentCalendar />
        <CampaignsTable />
      </div>
    </AppShell>
  );
}