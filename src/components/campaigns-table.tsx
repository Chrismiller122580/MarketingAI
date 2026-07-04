"use client";

import { usePosts } from "@/context/posts-context";

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  Scheduled: "bg-amber-50 text-amber-700",
};

export function CampaignsTable() {
  const { packs } = usePosts();

  const hasPacks = packs.length > 0;

  // Show real saved campaign packs; fall back to helpful empty state
  const campaigns = hasPacks
    ? packs.slice(0, 8).map((pack, index) => {
        const scheduledCount = pack.posts.filter((p) => p.scheduledFor).length;
        const status = scheduledCount > 0 ? "Scheduled" : index === 0 ? "Active" : "Draft";
        return {
          name: pack.name,
          status,
          channel: `${pack.posts.length} posts`,
          reach: scheduledCount > 0 ? `${scheduledCount} scheduled` : "—",
          engagement: "—",
          source: "Saved pack",
          id: pack.id,
        };
      })
    : [
        {
          name: "Generate and save a campaign pack to see it here",
          status: "Draft",
          channel: "—",
          reach: "—",
          engagement: "—",
          source: "—",
          id: "empty",
        },
      ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {hasPacks ? "Your saved campaign packs" : "Campaigns"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hasPacks
              ? "Packs you generated and saved from the Campaign Pack tool"
              : "Generate a campaign pack above to populate real saved campaigns here"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-6 py-3">Campaign</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3">Est. Reach</th>
              <th className="px-6 py-3">Engagement</th>
              <th className="px-6 py-3">Source page</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {campaigns.map((campaign, idx) => (
              <tr
                key={campaign.id ?? campaign.name ?? idx}
                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/80"
              >
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                  {campaign.name}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[campaign.status]}`}
                  >
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{campaign.channel}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{campaign.reach}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {campaign.engagement}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{campaign.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}