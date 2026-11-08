import { AppShell } from "@/components/app-shell";
import { CampaignPack } from "@/components/campaign-pack";
import { CampaignsTable } from "@/components/campaigns-table";

export default function CampaignsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <CampaignPack />
        <CampaignsTable />
      </div>
    </AppShell>
  );
}
