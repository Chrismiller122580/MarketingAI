import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ContentGenerator } from "@/components/content-generator";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (type === "video" || type === "reels-stories") {
    redirect("/creator-studio?shoot=1&focus=video");
  }

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
