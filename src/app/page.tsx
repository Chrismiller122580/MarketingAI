import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "MarketingAI — AI marketing grounded in your website",
  description:
    "Crawl your domain, generate on-brand posts with images, build campaign packs, and schedule publishing — all in one workspace.",
};

export default function Home() {
  return <LandingPage />;
}