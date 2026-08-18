"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  Database,
  Globe,
  Hand,
  Mic,
  Pointer,
  Shirt,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
} from "lucide-react";
import type { InfluencerScriptScene } from "@/lib/viraforge/influencer-script";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading, LoadingSkeleton, Spinner } from "./loading-indicator";
import { InfluencerSiteContentPanel } from "./influencer-site-content-panel";
import {
  InfluencerRenderLibrary,
  type SavedRender,
} from "./influencer-render-library";
import {
  creatorAvatarSchema,
  defaultCreatorAvatarValues,
  type CreatorAvatarForm,
} from "@/lib/schemas/creator-avatar-schema";
import {
  defaultProductFactsValues,
  productFactsSchema,
  type ProductFactsForm,
} from "@/lib/schemas/product-facts-schema";
import { AvatarFieldPicker } from "@/components/avatar-field-picker";
import { CrawledPagePicker } from "@/components/crawled-page-picker";
import { resolveDisplayMediaUrl } from "@/lib/display-media-url";
import { recommendSourcePage } from "@/lib/crawled-page-utils";
import { useSite } from "@/context/site-context";
import {
  applyRecommendations,
  buildAvatarBrief,
  type AvatarFieldKey,
  type AvatarFieldOptions,
} from "@/lib/viraforge/avatar-from-site";
import {
  wardrobeQuickPicks,
  type FieldOption,
} from "@/lib/viraforge/avatar-option-presets";
import { buildAvatarPreviewSummary } from "@/lib/viraforge/avatar-prompts";
import type {
  InfluencerAssets,
  InfluencerMotionType,
} from "@/lib/viraforge/influencer-assets";
import { MOTION_ACTIONS } from "@/lib/viraforge/motion-actions";
import {
  extractCrawledProductFacts,
  factsTabLabel,
  inferProductFactFields,
  normalizeProductFactsForSite,
} from "@/lib/viraforge/site-facts-extractor";

type CreatorTab =
  | "physical"
  | "demographics"
  | "cultural"
  | "wardrobe"
  | "style"
  | "facts"
  | "motion"
  | "library"
  | "site-content";

const TABS: { id: CreatorTab; label: string }[] = [
  { id: "physical", label: "Physical" },
  { id: "demographics", label: "Location + Age" },
  { id: "cultural", label: "Culture + Class" },
  { id: "wardrobe", label: "Wardrobe" },
  { id: "style", label: "Personality + Voice" },
  { id: "facts", label: "Product Facts" },
  { id: "motion", label: "Motion & Voice" },
  { id: "library", label: "Render Library" },
  { id: "site-content", label: "Site Content" },
];

const SCRIPT_PRESETS: {
  scene: InfluencerScriptScene;
  label: string;
}[] = [
  { scene: "greet", label: "Say hello" },
  { scene: "intro", label: "Introduce me" },
  { scene: "pitch", label: "Pitch product" },
  { scene: "quote", label: "Signature line" },
  { scene: "cta", label: "Call to action" },
];

const BODY_TYPE_HINTS: Record<number, string> = {
  0: "Slim",
  25: "Lean athletic",
  50: "Athletic",
  65: "Fit toned • Medium olive",
  75: "Curvy athletic",
  100: "Muscular",
};

function personaInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function bodyTypeHint(value: number): string {
  const keys = Object.keys(BODY_TYPE_HINTS)
    .map(Number)
    .sort((a, b) => a - b);
  let closest = keys[0];
  for (const key of keys) {
    if (Math.abs(key - value) < Math.abs(closest - value)) closest = key;
  }
  return BODY_TYPE_HINTS[closest] ?? "Athletic";
}

async function postLearn(
  eventType: string,
  payload: Record<string, unknown>,
  influencerId?: string,
) {
  await fetch("/api/creator-studio/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, payload, influencerId }),
  });
}

export function ViraForgeCreatorStudio() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold">ViraForge Creator Studio</h2>
      <p className="mt-2 text-muted-foreground">
        Full studio is being restored with the Avatar Name Generator. Please refresh shortly.
      </p>
    </div>
  );
}
