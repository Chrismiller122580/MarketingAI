import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "crawlspark.ai — Crawl your site, spark your content",
  description:
    "Crawl a brand or client site, generate on-brand posts, and publish. One Meta login can cover many Facebook Pages. Free includes one site and 15 posts a month. Install on Android and iPhone.",
};

export default function Home() {
  return <LandingPage />;
}