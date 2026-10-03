import Link from "next/link";
import { LandingNav } from "./landing-nav";

const features = [
  {
    icon: "\ud83c\udf10",
    title: "Full-site crawl",
    description:
      "Index every page, image, and keyword from your domain. AI extracts brand voice, topics, and messaging automatically.",
  },
  {
    icon: "\u2726",
    title: "Smart content generation",
    description:
      "Generate platform-native posts grounded in your real site content \u2014 not generic filler copy.",
  },
  {
    icon: "\ud83d\uddbc",
    title: "Image matching & AI visuals",
    description:
      "Auto-match crawled images to posts, or generate branded visuals with AI when you need something new.",
  },
  {
    icon: "\u25ce",
    title: "Campaign packs",
    description:
      "On Pro, spin up a full pack for launches and seasonal promos. Free includes 15 posts a month.",
  },
  {
    icon: "\u25a3",
    title: "Content calendar",
    description:
      "Drag-and-drop scheduling across platforms. See your pipeline at a glance.",
  },
  {
    icon: "\u2197",
    title: "One-click publishing",
    description:
      "Publish directly to social APIs, or get share-ready links when direct posting isn't configured.",
  },
  {
    icon: "\ud83d\udc65",
    title: "One login, many Pages",
    description:
      "Pro and above: connect Meta once and assign a different Facebook Page to each client site.",
  },
];

const steps = [
  {
    step: "01",
    title: "Add a site",
    description:
      "Crawl your website. We pull pages, images, and brand voice in seconds.",
  },
  {
    step: "02",
    title: "Generate content",
    description:
      "Create posts from your pages. Free includes 15 a month; Pro unlocks full campaign packs.",
  },
  {
    step: "03",
    title: "Schedule & publish",
    description:
      "Publish to Facebook and Instagram on Free. Pro adds more accounts, calendar, and auto-publish.",
  },
];

const platforms = [
  "LinkedIn",
  "X / Twitter",
  "Instagram",
  "Facebook",
  "Pinterest",
  "Email",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <LandingNav />
      <main className="px-6 py-16">
        <h1 className="text-4xl font-bold">Turn your site into a content engine</h1>
        <p className="mt-4">Crawl a domain, generate on-brand posts, and publish.</p>
        <a href="/signup">Start free</a>
        <section id="pricing" className="mt-16">
          <h2>Simple, flexible pricing</h2>
          <p>Enterprise Plus includes Creator Studio avatars, talk / motion clips, and fact-locked site content.</p>
          <a href="/signup">Choose Plus</a>
        </section>
      </main>
    </div>
  );
}
