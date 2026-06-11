import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "crawlspark.ai — Crawl your site, spark your content",
  description:
    "Crawl your domain, generate on-brand posts with images, build campaign packs, and schedule publishing — all in one workspace. Install as an app on Android and iPhone.",
};

export default function Home() {
  return <LandingPage />;
}