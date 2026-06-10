import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { CampaignsTable } from "@/components/campaigns-table";
import { SitePagesPanel } from "@/components/site-pages-panel";

export default function CampaignsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <DomainInput />
        <CampaignsTable />
        <SitePagesPanel />
      </div>
    </AppShell>
  );
}