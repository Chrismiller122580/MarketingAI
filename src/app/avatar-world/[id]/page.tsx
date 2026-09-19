import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AvatarWorldProfile } from "@/components/avatar-world-profile";
import { CreatorGate } from "@/components/creator-gate";

export const metadata: Metadata = {
  title: "Avatar profile",
  description: "A person living in Avatar World.",
};

export default async function AvatarWorldProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <CreatorGate title="Avatar World">
        <Suspense>
          <AvatarWorldProfile influencerId={id} />
        </Suspense>
      </CreatorGate>
    </AppShell>
  );
}
