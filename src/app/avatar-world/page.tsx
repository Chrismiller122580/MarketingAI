import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AvatarWorldHub } from "@/components/avatar-world-hub";

export const metadata: Metadata = {
  title: "Avatar World",
  description:
    "Admin-only living world. Invite residents and allow the public to use them.",
};

export default async function AvatarWorldPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <AppShell>
      <AvatarWorldHub />
    </AppShell>
  );
}
