import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const steps = [
  {
    n: "1",
    title: "Crawl the site on Home",
    body: "Home is the only place with the big crawl card. Enter the domain once. The small box in the header switches sites from any page after that.",
    href: "/dashboard",
    action: "Open Home",
  },
  {
    n: "2",
    title: "One page, one job",
    body: "Home is the site and this week's pack. Campaigns is strategy, the calendar, and the photo set. Publish only writes and ships a clip you already shot. Post Library is saved posts. Avatars builds the person and shoots the video.",
    href: "/campaigns",
    action: "Open Campaigns",
  },
  {
    n: "3",
    title: "Make one photo before a pile",
    body: "On Campaigns, write one sentence for the picture. Make one sample. If it is wrong, throw it back. Keep this look schedules that photo as the sample post. The rest of the set stays in that person, light, and color. Until you keep a sample, a pack writes posts and does not invent new photos.",
    href: "/campaigns",
    action: "Make a sample",
  },
  {
    n: "4",
    title: "Set the two dates",
    body: "Sample post is the one photo you kept. Campaign posts is the day the rest of the set goes out. Change the dates before you generate. The set does not pick those days for you after the fact.",
    href: "/campaigns",
    action: "Set the dates",
  },
  {
    n: "5",
    title: "Match the avatar to the city",
    body: "Open Avatars with the site loaded. A Chattanooga site gets a Southern English-speaking woman, not a default from another country. An avatar you already saved does not change. Generate the portrait again.",
    href: "/creator-studio",
    action: "Open Avatars",
  },
  {
    n: "6",
    title: "Shoot in Avatars. Publish does not",
    body: "Shoot is where the clip is made. Present a crawled page writes the caption and drops the spoken line into the script. It does not render. Shoot the clip there, then open Publish and attach the finished video.",
    href: "/creator-studio",
    action: "Open Avatars",
  },
] as const;

export default function TutorialPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            How CrawlSpark works
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Six steps. Do them in order.
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Crawl once. Keep one photo. Then make the set. Shoot the video in
            Avatars, and only then publish it.
          </p>
        </div>

        <ol className="space-y-3">
          {steps.map((step) => (
            <li
              key={step.n}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                  {step.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {step.body}
                  </p>
                  <Link
                    href={step.href}
                    className="mt-2 inline-block text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                  >
                    {step.action}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </AppShell>
  );
}
