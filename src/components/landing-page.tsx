import Link from "next/link";
import { LandingNav } from "./landing-nav";

const features = [
  {
    icon: "\uD83C\uDF10",
    title: "Full-site crawl",
    description:
      "Index every page, image, and keyword from your domain. AI extracts brand voice, topics, and messaging automatically.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <LandingNav />
      <main>
        <section id="pricing" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold">Simple, flexible pricing</h2>
            <ul>
              <li>Everything in Enterprise</li>
              <li>Creator Studio avatars</li>
              <li>Talk / motion clips</li>
              <li>Fact-locked site content</li>
            </ul>
            <a href="/signup">Get started free</a>
          </div>
        </section>
      </main>
    </div>
  );
}
