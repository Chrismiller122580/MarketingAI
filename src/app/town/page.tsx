import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AvatarTown } from "@/components/avatar-town";
import { CreatorGate } from "@/components/creator-gate";

export default function TownPage() {
  return (
    <AppShell>
      <CreatorGate title="Town">
        <Suspense>
          <AvatarTown />
        </Suspense>
      </CreatorGate>
    </AppShell>
  );
}
