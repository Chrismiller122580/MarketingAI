import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AvatarWorldHub } from "@/components/avatar-world-hub";

export const metadata: Metadata = {
  title: "Avatar World",
  description:
    "Living influencer profiles, video vaults, life events, and collaborations.",
};

export default function AvatarWorldPage() {
  return (
    <AppShell>
      <AvatarWorldHub />
    </AppShell>
  );
}
