import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { ContentGenerator } from "@/components/content-generator";
import { SiteImagesPanel } from "@/components/site-images-panel";

export default function ContentPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <DomainInput />
        <ContentGenerator />
        <SiteImagesPanel />
      </div>
    </AppShell>
  );
}