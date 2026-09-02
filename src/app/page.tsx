import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "crawlspark.ai — Crawl your site, spark your content",
  description:
    "Crawl your website, generate 15 on-brand posts a month, and publish to Facebook and Instagram. Upgrade to Pro for client sites and more accounts.",
};

export default function Home() {
  return <LandingPage />;
}