import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { ContentGenerator } from "@/components/content-generator";
import { AvatarPresentPanel } from "@/components/avatar-present-panel";
import { ContentStrategyPanel } from "@/components/content-strategy-panel";
import { SiteImagesPanel } from "@/components/site-images-panel";

export default function ContentPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <DomainInput />
        <ContentStrategyPanel />
        <AvatarPresentPanel />
        <Suspense>
          <ContentGenerator />
        </Suspense>
        <SiteImagesPanel />
      </div>
    </AppShell>
  );
}