import { Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DashboardInfluencers } from "@/components/dashboard-influencers";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { CreateChooser } from "@/components/create-chooser";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="min-w-0 space-y-8">
        <Suspense>
          <EmailVerificationBanner />
        </Suspense>
        <CreateChooser />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Link href="/settings#site" className="font-medium text-amber-700 hover:underline dark:text-amber-400">
            Add a site
          </Link>
          <span> if a post should follow a crawled page. </span>
          <Link href="/town" className="font-medium text-amber-700 hover:underline dark:text-amber-400">
            The town
          </Link>
          <span> is where the avatars live the day.</span>
        </p>
        <DashboardInfluencers />
      </div>
    </AppShell>
  );
}
