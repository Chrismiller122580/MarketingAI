import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AvatarWorldProfile } from "@/components/avatar-world-profile";

export const metadata: Metadata = {
  title: "Avatar profile",
  description: "Admin profile for a resident in Avatar World.",
};

export default async function AvatarWorldProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  return (
    <AppShell>
      <div className="min-w-0 overflow-x-hidden">
        <Suspense>
          <AvatarWorldProfile influencerId={id} />
        </Suspense>
      </div>
    </AppShell>
  );
}
