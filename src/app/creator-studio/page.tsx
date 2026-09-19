import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ViraForgeCreatorStudio } from "@/components/viraforge-creator-studio";
import { CreatorGate } from "@/components/creator-gate";

export const metadata: Metadata = {
  title: "Creator Studio",
  description:
    "Create hyper-realistic, culturally grounded influencer avatars with fact-locked persona fields.",
  openGraph: {
    title: "Creator Studio — crawlspark.ai",
    description:
      "Design and generate influencer avatars for social campaigns.",
  },
};

export default function CreatorStudioPage() {
  return (
    <AppShell>
      <CreatorGate title="Creator Studio">
        <Suspense>
          <ViraForgeCreatorStudio />
        </Suspense>
      </CreatorGate>
    </AppShell>
  );
}