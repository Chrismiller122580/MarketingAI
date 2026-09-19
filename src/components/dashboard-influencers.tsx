"use client";

import { InfluencersPanel } from "./influencers-panel";
import { useCreatorAccess } from "@/hooks/use-creator-access";

export function DashboardInfluencers() {
  const { allowed, ready } = useCreatorAccess();
  if (!ready || !allowed) return null;
  return <InfluencersPanel />;
}
