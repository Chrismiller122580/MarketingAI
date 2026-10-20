import Link from "next/link";

const choices = [
  {
    href: "/campaigns",
    kicker: "Image",
    title: "One photo",
    body: "Make a single sample on Campaigns. Keep it if the look is right, then the set stays in that look.",
  },
  {
    href: "/creator-studio?shoot=1&focus=video",
    kicker: "Video",
    title: "One TikTok",
    body: "Pick a saved avatar and make a vertical clip of that person talking. No page script on this screen.",
  },
] as const;

export function CreateChooser() {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Start here
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
          What do you want to make?
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map((choice) => (
          <Link
            key={choice.href}
            href={choice.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-500"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              {choice.kicker}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {choice.title}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {choice.body}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
