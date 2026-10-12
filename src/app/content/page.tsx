import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ContentGenerator } from "@/components/content-generator";

export default function ContentPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <Suspense>
          <ContentGenerator />
        </Suspense>
      </div>
    </AppShell>
  );
}
