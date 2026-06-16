import Link from "next/link";
import { PublicNav } from "@/components/public-nav";
import { getDeletionRequestStatus } from "@/lib/facebook-data-deletion";

type PageProps = {
  searchParams: Promise<{ code?: string }>;
};

const statusCopy: Record<
  string,
  { title: string; body: string; tone: "neutral" | "success" | "error" }
> = {
  pending: {
    title: "Deletion in progress",
    body: "We received your Facebook data deletion request and are processing it. Check back shortly.",
    tone: "neutral",
  },
  completed: {
    title: "Deletion completed",
    body: "Facebook-related tokens and connection data associated with your request have been removed from crawlspark.ai.",
    tone: "success",
  },
  failed: {
    title: "Deletion could not be completed",
    body: "We could not finish processing your request automatically. Contact privacy@crawlspark.ai with your confirmation code.",
    tone: "error",
  },
};

export default async function DataDeletionStatusPage({ searchParams }: PageProps) {
  const { code } = await searchParams;

  const request = code ? await getDeletionRequestStatus(code) : null;
  const copy = request
    ? statusCopy[request.status] ?? statusCopy.pending
    : null;

  const toneClasses = {
    neutral: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
    error: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicNav />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Facebook Data Deletion Status
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Track the status of your Meta/Facebook data deletion request.
        </p>

        {!code && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-700 dark:text-slate-300">
              Enter the confirmation code from your deletion request, or use the
              link returned when you removed crawlspark.ai from Facebook Apps
              and Websites.
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              You can also email{" "}
              <a href="mailto:privacy@crawlspark.ai" className="text-amber-600 hover:underline">
                privacy@crawlspark.ai
              </a>{" "}
              to request account deletion.
            </p>
          </div>
        )}

        {code && !request && (
          <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            <p className="font-medium">Confirmation code not found</p>
            <p className="mt-2 text-sm">
              Code <span className="font-mono">{code}</span> does not match any
              deletion request on record.
            </p>
          </div>
        )}

        {code && request && copy && (
          <div className="mt-8 space-y-4">
            <div className={`rounded-xl border p-6 ${toneClasses[copy.tone]}`}>
              <p className="text-lg font-semibold">{copy.title}</p>
              <p className="mt-2 text-sm">{copy.body}</p>
              {request.errorMessage && (
                <p className="mt-3 text-sm opacity-80">{request.errorMessage}</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm dark:border-slate-800 dark:bg-slate-900">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Confirmation code</dt>
                  <dd className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {request.confirmationCode}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                  <dd className="font-medium capitalize text-slate-900 dark:text-slate-100">
                    {request.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Requested</dt>
                  <dd className="text-slate-900 dark:text-slate-100">
                    {request.createdAt.toLocaleString()}
                  </dd>
                </div>
                {request.completedAt && (
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Completed</dt>
                    <dd className="text-slate-900 dark:text-slate-100">
                      {request.completedAt.toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-300">
            ← Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}