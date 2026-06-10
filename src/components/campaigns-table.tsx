"use client";

import { useSite } from "@/context/site-context";

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-amber-50 text-amber-700",
};

const placeholderCampaigns = [
  {
    name: "Enter a domain to generate campaigns",
    status: "Draft",
    channel: "—",
    reach: "—",
    engagement: "—",
    source: "—",
  },
];

export function CampaignsTable() {
  const { site } = useSite();

  const campaigns = site
    ? site.pages.slice(0, 8).map((page, index) => ({
        name: page.title,
        status: index < 2 ? "Active" : index < 5 ? "Scheduled" : "Draft",
        channel: page.images.length > 0 ? `Visual (${page.images.length} imgs)` : "Text only",
        reach: `${(page.excerpt.length * 12).toLocaleString()}`,
        engagement: `${(3 + (page.headings.length % 3)).toFixed(1)}%`,
        source: page.path,
      }))
    : placeholderCampaigns;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {site ? "Page-based campaigns" : "Recent Campaigns"}
          </h2>
          <p className="text-sm text-slate-500">
            {site
              ? "Campaign ideas generated from crawled site pages"
              : "Crawl a domain to populate campaigns from site content"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Campaign</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3">Est. Reach</th>
              <th className="px-6 py-3">Engagement</th>
              <th className="px-6 py-3">Source page</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((campaign) => (
              <tr
                key={campaign.name}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-6 py-4 font-medium text-slate-900">
                  {campaign.name}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[campaign.status]}`}
                  >
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{campaign.channel}</td>
                <td className="px-6 py-4 text-slate-600">{campaign.reach}</td>
                <td className="px-6 py-4 text-slate-600">
                  {campaign.engagement}
                </td>
                <td className="px-6 py-4 text-slate-600">{campaign.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}