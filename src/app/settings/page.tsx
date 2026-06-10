import { AppShell } from "@/components/app-shell";
import { DomainInput } from "@/components/domain-input";
import { SitePagesPanel } from "@/components/site-pages-panel";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <DomainInput />

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Profile</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account settings
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Display name
              </label>
              <input
                id="name"
                type="text"
                defaultValue="Jane Doe"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                defaultValue="jane@company.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Brand voice
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure how AI generates your content
          </p>

          <textarea
            rows={4}
            defaultValue="Professional yet approachable. Focus on clarity and value. Avoid jargon."
            className="mt-4 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <SitePagesPanel />
      </div>
    </AppShell>
  );
}