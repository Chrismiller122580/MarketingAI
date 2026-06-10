import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { SettingsForm } from "@/components/settings-form";
import { BrandInsights } from "@/components/brand-insights";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <DomainInput />
        <SettingsForm />
        <BrandInsights />
      </div>
    </AppShell>
  );
}