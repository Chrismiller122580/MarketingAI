import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AvatarWorldHub } from "@/components/avatar-world-hub";
import { CreatorGate } from "@/components/creator-gate";

export const metadata: Metadata = {
  title: "Avatar World",
  description:
    "A living world of avatars who post and chat on their own. Invite people with different lives.",
};

export default function AvatarWorldPage() {
  return (
    <AppShell>
      <CreatorGate title="Avatar World">
        <AvatarWorldHub />
      </CreatorGate>
    </AppShell>
  );
}