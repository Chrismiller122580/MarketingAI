import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AvatarWorldProfile } from "@/components/avatar-world-profile";

export const metadata: Metadata = {
  title: "Avatar profile",
  description: "Edit a living influencer profile in Avatar World.",
};

export default async function AvatarWorldProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <Suspense>
        <AvatarWorldProfile influencerId={id} />
      </Suspense>
    </AppShell>
  );
}
