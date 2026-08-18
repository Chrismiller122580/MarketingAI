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
import { AvatarNameGenerator } from "@/components/avatar-name-generator";
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
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("influencer");
  const domainParam = searchParams.get("domain");
  const { site, loadSavedSite, savedSites } = useSite();

  const [activeTab, setActiveTab] = useState<CreatorTab>("physical");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [influencerId, setInfluencerId] = useState<string | null>(editId);
  const [featuresText, setFeaturesText] = useState(
    defaultProductFactsValues.features.join("\n"),
  );
  const [ingredientsText, setIngredientsText] = useState(
    (defaultProductFactsValues.ingredients ?? []).join("\n"),
  );
  const [quoteValidation, setQuoteValidation] = useState<string[] | null>(null);
  const [hydrating, setHydrating] = useState(Boolean(editId));
  const [motionScript, setMotionScript] = useState(
    defaultCreatorAvatarValues.sampleQuote,
  );
  const [motionVideo, setMotionVideo] = useState<string | null>(null);
  const [voiceAudio, setVoiceAudio] = useState<string | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement>(null);
  const previewVoiceAudioRef = useRef<HTMLAudioElement>(null);

  const setVoiceAudioUrl = useCallback((url: string) => {
    setVoiceAudio(resolveDisplayMediaUrl(url));
  }, []);

  const playVoiceAudio = useCallback((url: string) => {
    const normalized = resolveDisplayMediaUrl(url);
    setVoiceAudio(normalized);
    requestAnimationFrame(() => {
      for (const el of [voiceAudioRef.current, previewVoiceAudioRef.current]) {
        if (!el) continue;
        el.load();
        void el.play().catch(() => undefined);
      }
    });
  }, []);
  const [motionLoading, setMotionLoading] = useState<InfluencerMotionType | null>(
    null,
  );
  const [pendingMotionPoll, setPendingMotionPoll] = useState<{
    jobId: string;
    motionType: InfluencerMotionType;
  } | null>(null);
  const [previewMode, setPreviewMode] = useState<"portrait" | "motion">(
    "portrait",
  );
  const [renderLibraryTick, setRenderLibraryTick] = useState(0);
  const [capabilities, setCapabilities] = useState<{
    motionVideoAvailable: boolean;
    voiceAvailable: boolean;
    motionTypes: Record<InfluencerMotionType, boolean>;
  } | null>(null);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [shortenLoading, setShortenLoading] = useState(false);
  const [voicePreviewLoading, setVoicePreviewLoading] = useState(false);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [talkPreflight, setTalkPreflight] = useState<{
    canRender: boolean;
    scriptHash: string;
    wordCount: number;
    estimatedDurationSec: number;
    checks: Array<{
      id: string;
      label: string;
      status: "pass" | "warn" | "fail";
      detail?: string;
    }>;
  } | null>(null);
  const [approvedTalkPreview, setApprovedTalkPreview] = useState<{
    scriptHash: string;
    renderId: string;
    audioUrl: string;
    durationSec: number;
  } | null>(null);
  const [suggestion, setSuggestion] = useState<AvatarFieldOptions | null>(null);
  const [selectedIds, setSelectedIds] = useState<
    Partial<Record<AvatarFieldKey, string>>
  >({});
  const [suggesting, setSuggesting] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showAllFactFields, setShowAllFactFields] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [selectedSourcePage, setSelectedSourcePage] = useState("/");

  const factFieldConfig = useMemo(
    () => inferProductFactFields(site),
    [site],
  );
  const factsTabTitle = useMemo(
    () => factsTabLabel(factFieldConfig.siteType, Boolean(site)),
    [factFieldConfig.siteType, site],
  );

  const personaForm = useForm<CreatorAvatarForm>({
    resolver: zodResolver(creatorAvatarSchema),
    defaultValues: defaultCreatorAvatarValues,
  });

  const factsForm = useForm<ProductFactsForm>({
    resolver: zodResolver(productFactsSchema),
    defaultValues: defaultProductFactsValues,
  });

  const watched = useWatch({ control: personaForm.control });
  const values = { ...defaultCreatorAvatarValues, ...watched };
  const generating = status === "loading";
  const motionBusy = motionLoading !== null;
  const previewSummary = buildAvatarPreviewSummary(values);

  const loadInfluencers = useCallback(async () => {
    setHydrating(Boolean(editId));
    try {
      const res = await fetch("/api/creator-studio/influencers");
      const data = (await res.json()) as {
        influencers?: Array<{
          id: string;
          persona: CreatorAvatarForm;
          assets?: InfluencerAssets;
          productFacts?: ProductFactsForm;
        }>;
        defaults?: Partial<CreatorAvatarForm>;
      };

      if (editId && data.influencers) {
        const match = data.influencers.find((i) => i.id === editId);
        if (match) {
          personaForm.reset({
            ...defaultCreatorAvatarValues,
            ...match.persona,
          });
          if (match.productFacts) {
            factsForm.reset(match.productFacts);
            setFeaturesText(match.productFacts.features.join("\n"));
            setIngredientsText((match.productFacts.ingredients ?? []).join("\n"));
          }
          if (match.assets?.portraitUrl) {
            setPreviewImage(match.assets.portraitUrl);
          }
          if (match.assets?.videoUrl) {
            setMotionVideo(match.assets.videoUrl);
            setPreviewMode("motion");
          }
          if (match.assets?.voiceAudioUrl) {
            setVoiceAudioUrl(match.assets.voiceAudioUrl);
          }
          if (match.assets?.lastScript) {
            setMotionScript(match.assets.lastScript);
          } else if (match.persona.sampleQuote) {
            setMotionScript(match.persona.sampleQuote);
          }
          if (
            match.assets?.motionStatus === "processing" &&
            match.assets.motionJobId &&
            match.assets.motionType
          ) {
            setPendingMotionPoll({
              jobId: match.assets.motionJobId,
              motionType: match.assets.motionType,
            });
          }
          setInfluencerId(match.id);
          return;
        }
      }

      if (data.defaults && Object.keys(data.defaults).length > 0) {
        personaForm.reset({
          ...defaultCreatorAvatarValues,
          ...data.defaults,
        });
      }
    } catch {
      /* keep defaults */
    } finally {
      setHydrating(false);
    }
  }, [editId, personaForm, factsForm]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form from API on mount
    void loadInfluencers();
  }, [loadInfluencers]);

  useEffect(() => {
    setShowAllFactFields(false);
  }, [site?.domain]);

  useEffect(() => {
    if (!site?.domain || editId) return;

    const current = factsForm.getValues();
    const stillDefault =
      current.name === defaultProductFactsValues.name &&
      current.price === defaultProductFactsValues.price;
    if (!stillDefault) return;

    const crawled = extractCrawledProductFacts(site);
    const config = inferProductFactFields(site);
    const prefilled = normalizeProductFactsForSite(
      {
        name: crawled.name ?? site.brand.name,
        price: crawled.price || defaultProductFactsValues.price,
        features: crawled.features?.length
          ? crawled.features
          : [site.brand.tagline || site.brand.name],
        location: config.location.show ? crawled.location : undefined,
        hours: config.hours.show ? crawled.hours : undefined,
        ingredients: [],
      },
      config,
    );

    factsForm.reset(prefilled);
    setFeaturesText(prefilled.features.join("\n"));
    setIngredientsText((prefilled.ingredients ?? []).join("\n"));
  }, [site?.domain, editId, factsForm]);

  useEffect(() => {
    fetch("/api/creator-studio/capabilities")
      .then((r) => r.json())
      .then((data) => setCapabilities(data))
      .catch(() => setCapabilities(null));
  }, []);

  useEffect(() => {
    if (!site?.pages.length) return;
    const recommended = recommendSourcePage(site);
    setSelectedSourcePage(recommended?.path ?? site.pages[0]?.path ?? "/");
  }, [site?.domain, site?.pages.length]);

  const bumpRenderLibrary = useCallback(() => {
    setRenderLibraryTick((n) => n + 1);
  }, []);

  const pollMotionJob = useCallback(
    async (jobId: string, motionType: InfluencerMotionType) => {
      const maxAttempts = 90;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
        const res = await fetch(`/api/creator-studio/motion/status/${jobId}`);
        const data = (await res.json()) as {
          status?: string;
          videoUrl?: string;
          voiceAudioUrl?: string;
          audioEmbeddedInVideo?: boolean;
          error?: string;
        };

        if (data.status === "ready" && data.videoUrl) {
          setMotionVideo(data.videoUrl);
          setPreviewMode("motion");
          if (motionType === "talk" && data.audioEmbeddedInVideo) {
            setVoiceAudio(null);
          } else if (data.voiceAudioUrl) {
            setVoiceAudioUrl(data.voiceAudioUrl);
          }
          setMotionLoading(null);
          bumpRenderLibrary();
          toast.success(
            motionType === "talk"
              ? "Talking clip ready — voice synced into video."
              : `${motionType.charAt(0).toUpperCase()}${motionType.slice(1)} clip ready.`,
          );
          return;
        }

        if (data.status === "failed") {
          setMotionLoading(null);
          toast.error(data.error ?? "Motion generation failed");
          return;
        }
      }

      setMotionLoading(null);
      toast.error("Motion generation timed out. Check back on dashboard later.");
    },
    [bumpRenderLibrary],
  );

  useEffect(() => {
    if (!pendingMotionPoll) return;
    const { jobId, motionType } = pendingMotionPoll;
    setPendingMotionPoll(null);
    setMotionLoading(motionType);
    void pollMotionJob(jobId, motionType);
  }, [pendingMotionPoll, pollMotionJob]);

  const runTalkPreflight = useCallback(
    async (scriptText: string, approvedHash?: string) => {
      if (!influencerId || !scriptText.trim()) {
        setTalkPreflight(null);
        return;
      }

      setPreflightLoading(true);
      try {
        const res = await fetch("/api/creator-studio/motion/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            influencerId,
            script: scriptText,
            approvedScriptHash: approvedHash,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          canRender?: boolean;
          scriptHash?: string;
          wordCount?: number;
          estimatedDurationSec?: number;
          checks?: Array<{
            id: string;
            label: string;
            status: "pass" | "warn" | "fail";
            detail?: string;
          }>;
        };
        if (!res.ok) throw new Error(data.error ?? "Preflight failed");
        setTalkPreflight({
          canRender: !!data.canRender,
          scriptHash: data.scriptHash ?? "",
          wordCount: data.wordCount ?? 0,
          estimatedDurationSec: data.estimatedDurationSec ?? 0,
          checks: data.checks ?? [],
        });
      } catch {
        setTalkPreflight(null);
      } finally {
        setPreflightLoading(false);
      }
    },
    [influencerId],
  );

  useEffect(() => {
    if (!influencerId || activeTab !== "motion") return;

    const approvedHash =
      approvedTalkPreview &&
      talkPreflight &&
      approvedTalkPreview.scriptHash === talkPreflight.scriptHash
        ? approvedTalkPreview.scriptHash
        : undefined;

    const timer = setTimeout(() => {
      void runTalkPreflight(motionScript, approvedHash);
    }, 400);

    return () => clearTimeout(timer);
  }, [
    motionScript,
    influencerId,
    activeTab,
    approvedTalkPreview,
    talkPreflight?.scriptHash,
    runTalkPreflight,
  ]);

  useEffect(() => {
    if (
      approvedTalkPreview &&
      talkPreflight &&
      approvedTalkPreview.scriptHash !== talkPreflight.scriptHash
    ) {
      setApprovedTalkPreview(null);
    }
  }, [approvedTalkPreview, talkPreflight]);

  const handleShortenForLipsync = async () => {
    if (!influencerId) {
      toast.error("Save the influencer first");
      return;
    }
    const text = motionScript.trim();
    if (!text) {
      toast.error("Add a script to shorten");
      return;
    }

    setShortenLoading(true);
    setApprovedTalkPreview(null);
    try {
      const res = await fetch("/api/creator-studio/motion/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerId, script: text }),
      });
      const data = (await res.json()) as {
        error?: string;
        script?: string;
        validation?: { valid: boolean; violations: string[] };
      };
      if (!res.ok) throw new Error(data.error ?? "Shorten failed");
      if (data.script) {
        setMotionScript(data.script);
        toast.success("Script shortened for lip-sync");
      }
      if (data.validation && !data.validation.valid) {
        setQuoteValidation(data.validation.violations);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not shorten script");
    } finally {
      setShortenLoading(false);
    }
  };

  const handleMotion = async (
    motionType: InfluencerMotionType,
    scriptOverride?: string,
  ) => {
    if (!previewImage) {
      toast.error("Generate a portrait before motion clips");
      setActiveTab("physical");
      return;
    }

    if (!influencerId) {
      toast.error("Save the influencer first so motion clips can be stored");
      return;
    }

    const talkScript =
      motionType === "talk" ? (scriptOverride ?? motionScript) : undefined;

    if (motionType === "talk") {
      if (!approvedTalkPreview?.renderId || !approvedTalkPreview.scriptHash) {
        toast.error("Preview voice and approve it before rendering Talk");
        return;
      }
      if (
        talkPreflight &&
        approvedTalkPreview.scriptHash !== talkPreflight.scriptHash
      ) {
        toast.error("Script changed — preview voice again");
        return;
      }
    }

    setMotionLoading(motionType);
    setQuoteValidation(null);

    try {
      const res = await fetch("/api/creator-studio/motion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerId,
          motionType,
          script: talkScript,
          ...(motionType === "talk" && approvedTalkPreview
            ? {
                approvedVoiceRenderId: approvedTalkPreview.renderId,
                approvedScriptHash: approvedTalkPreview.scriptHash,
              }
            : {}),
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        jobId?: string;
        voiceAudioUrl?: string;
        quoteValidation?: { violations: string[] };
      };

      if (!res.ok) {
        if (payload.quoteValidation?.violations) {
          setQuoteValidation(payload.quoteValidation.violations);
        }
        throw new Error(payload.error ?? "Motion request failed");
      }

      if (payload.voiceAudioUrl) setVoiceAudioUrl(payload.voiceAudioUrl);
      if (payload.jobId) void pollMotionJob(payload.jobId, motionType);
      else setMotionLoading(null);
    } catch (err) {
      setMotionLoading(null);
      toast.error(err instanceof Error ? err.message : "Motion failed");
    }
  };

  const handleGenerateScript = async (
    scene: InfluencerScriptScene,
    draftText?: string,
  ) => {
    if (!influencerId) {
      toast.error("Save the influencer before generating scripts");
      return;
    }

    setScriptGenerating(true);
    setQuoteValidation(null);
    try {
      const res = await fetch("/api/creator-studio/motion/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerId,
          scene,
          draftText,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        script?: string;
        validation?: { valid: boolean; violations: string[] };
      };
      if (!res.ok) throw new Error(data.error ?? "Script generation failed");
      if (data.script) {
        setMotionScript(data.script);
        toast.success("Script ready — preview voice or hit Talk");
      }
      if (data.validation && !data.validation.valid) {
        setQuoteValidation(data.validation.violations);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not write script");
    } finally {
      setScriptGenerating(false);
    }
  };

  const handleVoicePreview = async (script?: string) => {
    if (!influencerId) {
      toast.error("Save the influencer first");
      return;
    }
    const text = (script ?? motionScript).trim();
    if (!text) {
      toast.error("Add a talking script first");
      return;
    }

    setVoicePreviewLoading(true);
    setQuoteValidation(null);
    setApprovedTalkPreview(null);
    try {
      const res = await fetch("/api/creator-studio/motion/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerId, script: text }),
      });
      const data = (await res.json()) as {
        error?: string;
        audioDataUrl?: string;
        audioUrl?: string;
        scriptHash?: string;
        renderId?: string;
        durationSec?: number;
        quoteValidation?: { violations: string[] };
      };
      if (!res.ok) {
        if (data.quoteValidation?.violations) {
          setQuoteValidation(data.quoteValidation.violations);
        }
        throw new Error(data.error ?? "Voice preview failed");
      }
      const audio = data.audioUrl ?? data.audioDataUrl;
      if (audio && data.scriptHash && data.renderId) {
        setApprovedTalkPreview({
          scriptHash: data.scriptHash,
          renderId: data.renderId,
          audioUrl: audio,
          durationSec: data.durationSec ?? 0,
        });
        playVoiceAudio(audio);
        bumpRenderLibrary();
        void runTalkPreflight(text, data.scriptHash);
        toast.success(
          `Voice approved (~${data.durationSec ?? "?"}s) — you can render Talk`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice preview failed");
    } finally {
      setVoicePreviewLoading(false);
    }
  };

  const handleApplyRender = useCallback(
    (assets: InfluencerAssets, render: SavedRender) => {
      if (assets.portraitUrl) {
        setPreviewImage(assets.portraitUrl);
        setPreviewMode("portrait");
      }
      if (assets.videoUrl) {
        setMotionVideo(assets.videoUrl);
        setPreviewMode("motion");
      }
      if (assets.voiceAudioUrl) setVoiceAudioUrl(assets.voiceAudioUrl);
      if (render.script) setMotionScript(render.script);
      else if (assets.lastScript) setMotionScript(assets.lastScript);
    },
    [],
  );

  const handleAvatarSpeak = (script: string, talkNow?: boolean) => {
    setMotionScript(script.slice(0, 500));
    setApprovedTalkPreview(null);
    setActiveTab("motion");
    if (talkNow) {
      toast.info("Preview voice in Motion tab before rendering Talk");
    } else {
      toast.success("Script loaded — run preflight and preview voice");
    }
  };

  const recordFieldEdit = (field: string, value: unknown) => {
    postLearn("field_edit", { field, value }, influencerId ?? undefined);
  };

  const applySuggestionToForms = useCallback(
    (next: AvatarFieldOptions) => {
      setSuggestion(next);
      setSelectedIds(next.recommended);

      const personaPatch = applyRecommendations(next.recommended, next.fields);
      personaForm.reset({
        ...defaultCreatorAvatarValues,
        ...personaForm.getValues(),
        ...Object.fromEntries(
          Object.entries(personaPatch).filter(([, v]) => v !== undefined),
        ),
      });

      if (next.productFacts) {
        const fieldConfig = next.factFields ?? inferProductFactFields(site);
        const current = factsForm.getValues();
        const pf: ProductFactsForm = {
          ...defaultProductFactsValues,
          ...current,
          name: next.productFacts.name ?? current.name,
          price: next.productFacts.price ?? current.price,
          features:
            next.productFacts.features ?? defaultProductFactsValues.features,
        };

        if (fieldConfig.location.show && next.productFacts.location) {
          pf.location = next.productFacts.location;
        }
        if (fieldConfig.hours.show && next.productFacts.hours) {
          pf.hours = next.productFacts.hours;
        }
        if (fieldConfig.ingredients.show && next.productFacts.ingredients) {
          pf.ingredients = next.productFacts.ingredients;
        }

        factsForm.reset(
          normalizeProductFactsForSite(pf, fieldConfig, { showAllFields: false }),
        );
        setFeaturesText(pf.features.join("\n"));
        if (pf.ingredients?.length) {
          setIngredientsText(pf.ingredients.join("\n"));
        }
      }
    },
    [personaForm, factsForm, site],
  );

  const handleSuggest = useCallback(
    async (domainOverride?: string) => {
      const targetDomain = domainOverride ?? site?.domain;
      if (!targetDomain && !site) {
        toast.error("Crawl a site on the dashboard first, or open with ?domain=");
        return;
      }

      setSuggesting(true);
      try {
        const res = await fetch("/api/creator-studio/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: targetDomain,
            site: site ?? undefined,
            pagePath: selectedSourcePage,
          }),
        });
        const data = (await res.json()) as AvatarFieldOptions & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Suggest failed");

        applySuggestionToForms(data);
        toast.success(
          data.aiEnhanced
            ? `Site-smart options ready for ${data.domain} (AI-enhanced)`
            : `Site-smart options ready for ${data.domain}`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not suggest options");
      } finally {
        setSuggesting(false);
      }
    },
    [site, applySuggestionToForms, selectedSourcePage],
  );

  const pickOption = useCallback(
    (field: AvatarFieldKey, option: FieldOption) => {
      setSelectedIds((prev) => ({ ...prev, [field]: option.id }));

      if (field === "age" || field === "bodyType") {
        personaForm.setValue(field, Number(option.value), { shouldDirty: true });
      } else if (field === "gender") {
        personaForm.setValue(
          "gender",
          option.value as CreatorAvatarForm["gender"],
          { shouldDirty: true },
        );
      } else {
        personaForm.setValue(field, option.value, { shouldDirty: true });
      }
      recordFieldEdit(field, option.value);
    },
    [personaForm],
  );

  const pickCustom = useCallback(
    (field: AvatarFieldKey, value: string) => {
      setSelectedIds((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });

      if (field === "age" || field === "bodyType") {
        const num = Number(value);
        if (!Number.isNaN(num)) {
          personaForm.setValue(field, num, { shouldDirty: true });
        }
      } else if (field === "gender") {
        if (["female", "male", "nonbinary"].includes(value)) {
          personaForm.setValue(
            "gender",
            value as CreatorAvatarForm["gender"],
            { shouldDirty: true },
          );
        }
      } else {
        personaForm.setValue(field, value, { shouldDirty: true });
      }
      recordFieldEdit(field, value);
    },
    [personaForm],
  );

  const renderPicker = (
    field: AvatarFieldKey,
    label: string,
    options?: FieldOption[],
    allowCustom = true,
  ) => {
    if (!options?.length) return null;
    return (
      <AvatarFieldPicker
        key={field}
        fieldId={field}
        label={label}
        options={options}
        selectedId={selectedIds[field]}
        customValue={String(personaForm.getValues(field) ?? "")}
        onSelect={(opt) => pickOption(field, opt)}
        onCustom={(v) => pickCustom(field, v)}
        allowCustom={allowCustom}
        className={
          field === "personalityVoice" ||
          field === "sampleQuote" ||
          field === "wardrobe" ||
          field === "culturalNotes"
            ? "sm:col-span-2"
            : ""
        }
      />
    );
  };

  useEffect(() => {
    if (!domainParam || editId) return;
    void loadSavedSite(domainParam).then(() => {
      void handleSuggest(domainParam);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for deep link
  }, [domainParam, editId]);

  const parseFacts = (): ProductFactsForm => {
    const base = factsForm.getValues();
    const parsed = {
      ...base,
      features: featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      ingredients: ingredientsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    return normalizeProductFactsForSite(parsed, factFieldConfig, {
      showAllFields: showAllFactFields,
    });
  };

  const shouldShowFactField = (
    field: keyof Pick<
      typeof factFieldConfig,
      "price" | "location" | "hours" | "ingredients"
    >,
  ) => showAllFactFields || factFieldConfig[field].show;

  const handleSave = async () => {
    const persona = personaForm.getValues();
    const productFacts = parseFacts();
    const parsed = productFactsSchema.safeParse(productFacts);
    if (!parsed.success) {
      toast.error("Fix product facts before saving");
      setActiveTab("facts");
      return;
    }

    try {
      const res = await fetch("/api/creator-studio/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          productFacts: parsed.data,
          assets: previewImage ? { portraitUrl: previewImage } : undefined,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        influencerId?: string;
        quoteValidation?: { valid: boolean; violations: string[] };
      };
      if (!res.ok) throw new Error(payload.error ?? "Save failed");

      if (payload.influencerId) setInfluencerId(payload.influencerId);
      setQuoteValidation(payload.quoteValidation?.violations ?? null);
      toast.success("Influencer saved. Preferences updated for next generation.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  };

  const handleDeleteAvatar = async () => {
    if (!influencerId) return;

    const persona = personaForm.getValues();
    if (
      !window.confirm(
        `Delete ${persona.displayName} (@${persona.handle})? This removes the avatar, all renders, and saved facts. Linked posts are kept.`,
      )
    ) {
      return;
    }

    setDeletingAvatar(true);
    try {
      const res = await fetch(`/api/creator-studio/influencers/${influencerId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string; displayName?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");

      toast.success(`${data.displayName ?? persona.displayName} deleted`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete avatar");
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handleGenerate = personaForm.handleSubmit(async (persona) => {
    setStatus("loading");
    setError(null);
    setQuoteValidation(null);

    const productFacts = parseFacts();
    const factsParsed = productFactsSchema.safeParse(productFacts);
    if (!factsParsed.success) {
      setStatus("error");
      setError(`Complete the ${factsTabTitle} tab before generating`);
      setActiveTab("facts");
      return;
    }

    try {
      const res = await fetch("/api/creator-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          productFacts: factsParsed.data,
          influencerId,
          siteContext: site
            ? {
                domain: site.domain,
                brandName: site.brand.name,
                tone: site.brand.tone,
                tagline: site.brand.tagline,
              }
            : suggestion
              ? {
                  domain: suggestion.domain,
                  brandName: suggestion.productFacts?.name,
                }
              : undefined,
          suggestionSnapshot: suggestion
            ? {
                fitScore: suggestion.fitScore,
                rationale: suggestion.rationale,
                recommended: suggestion.recommended,
                domain: suggestion.domain,
              }
            : undefined,
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        imageUrl?: string;
        influencerId?: string;
        quoteValidation?: { valid: boolean; violations: string[] };
        personalizationUsed?: boolean;
      };

      if (!res.ok) {
        if (payload.quoteValidation?.violations) {
          setQuoteValidation(payload.quoteValidation.violations);
        }
        throw new Error(payload.error ?? "Generation failed");
      }

      if (payload.imageUrl) setPreviewImage(payload.imageUrl);
      if (payload.influencerId) setInfluencerId(payload.influencerId);

      setStatus("success");
      bumpRenderLibrary();
      toast.success(
        payload.personalizationUsed
          ? `Avatar generated using your saved preferences for ${persona.displayName}.`
          : `Avatar generated for ${persona.displayName}.`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not generate avatar";
      setStatus("error");
      setError(message);
      toast.error(message);
    }
  });

  const inputClass =
    "mt-2 w-full rounded-lg border border-border bg-muted p-3 text-sm text-foreground";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-28 sm:pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
              ViraForge
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
              LEARNING BETA
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Create New Influencer Avatar
          </h2>
          <p className="text-sm text-muted-foreground">
            Persona + locked product facts. The system learns from your edits to
            tailor future outputs.
          </p>
          {session?.user?.name && (
            <p className="mt-1 text-xs text-muted-foreground">
              Signed in as {session.user.name}
              {influencerId ? ` · Editing @${values.handle}` : ""}
            </p>
          )}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
            {influencerId ? (
              <p>
                <span className="font-medium text-foreground">
                  Saved in PostgreSQL
                </span>{" "}
                — table{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  Influencer
                </code>
                , id{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  {influencerId}
                </code>
                .{" "}
                <Link
                  href="/dashboard"
                  className="font-medium text-violet-600 hover:underline dark:text-violet-400"
                >
                  View all on dashboard
                </Link>
              </p>
            ) : (
              <p>
                Not saved yet. Records are written to PostgreSQL (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  Influencer
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  ProductFacts
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  CreatorLearningEvent
                </code>
                ) when you save or generate.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || hydrating || deletingAvatar}
            aria-busy={generating}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-base font-semibold hover:from-violet-500 hover:to-fuchsia-500"
          >
            {generating ? (
              <InlineLoading label={`Generating ${values.displayName}…`} />
            ) : hydrating ? (
              <InlineLoading label="Loading persona…" />
            ) : (
              "Generate Avatar Package"
            )}
          </Button>
          {influencerId && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={generating || deletingAvatar}
              onClick={() => void handleDeleteAvatar()}
            >
              {deletingAvatar ? (
                <InlineLoading label="Deleting avatar…" />
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete avatar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {(site || domainParam || savedSites.length > 0) && (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm">
              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
              <div>
                <p className="font-medium text-foreground">
                  {site
                    ? `${site.brand.name} · ${site.domain}`
                    : domainParam
                      ? `Loading ${domainParam}…`
                      : "Select a crawled site"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {suggestion
                    ? `${suggestion.rationale} Fit score: ${suggestion.fitScore}%`
                    : "Suggest selectable avatar options from your crawl — religion, class, voice, and more."}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              {!site && savedSites.length > 0 && (
                <select
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs sm:w-auto"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) void loadSavedSite(e.target.value);
                  }}
                >
                  <option value="" disabled>
                    Load client…
                  </option>
                  {savedSites.map((s) => (
                    <option key={s.domain} value={s.domain}>
                      {s.brandName}
                    </option>
                  ))}
                </select>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                disabled={suggesting || (!site && !domainParam)}
                onClick={() => void handleSuggest()}
              >
                {suggesting ? (
                  <InlineLoading label="Suggesting…" />
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Suggest options from site
                  </>
                )}
              </Button>
              {suggestion && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setShowBrief((v) => !v)}
                >
                  Avatar brief
                </Button>
              )}
            </div>
          </div>
          {showBrief && suggestion && (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
              {buildAvatarBrief(values, suggestion)}
            </pre>
          )}
          {site && site.pages.length > 0 && (
            <div className="mt-4 border-t border-violet-500/15 pt-4">
              <CrawledPagePicker
                id="avatarSourcePage"
                label="Source page for avatar & product facts"
                hint="Pick which crawled page drives avatar voice, quotes, and locked product facts. Filter by page type or search by title and content."
                pages={site.pages}
                value={selectedSourcePage}
                onChange={setSelectedSourcePage}
                valueMode="path"
                recommendedPath={recommendSourcePage(site)?.path}
              />
              {suggestion?.sourcePage && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last suggestion used{" "}
                  <span className="font-medium text-foreground">
                    {suggestion.sourcePage.path}
                  </span>{" "}
                  — {suggestion.sourcePage.title}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleGenerate} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 lg:col-span-7">
          <div
            role="tablist"
            aria-label="Avatar configuration"
            className="-mx-1 flex gap-2 overflow-x-auto border-b border-border px-1 pb-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 snap-start rounded-lg px-4 py-2.5 text-sm font-medium transition-colors min-h-10 sm:min-h-0 sm:py-2 ${
                  activeTab === tab.id
                    ? "bg-violet-600 text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.id === "facts" ? factsTabTitle : tab.label}
              </button>
            ))}
          </div>

          {activeTab === "physical" && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AvatarNameGenerator
                  location={values.location || ""}
                  gender={(values.gender as "female" | "male" | "nonbinary") || "female"}
                  selectedName={values.displayName}
                  onSelect={(name, handle) => {
                    personaForm.setValue("displayName", name, { shouldDirty: true });
                    personaForm.setValue("handle", handle, { shouldDirty: true });
                    recordFieldEdit("displayName", name);
                    recordFieldEdit("handle", handle);
                  }}
                  onGenderChange={(g) => {
                    personaForm.setValue("gender", g, { shouldDirty: true });
                    recordFieldEdit("gender", g);
                  }}
                />
              </div>
              {suggestion ? (
                <>
                  {renderPicker("handle", "Social handle", suggestion.fields.handle)}
                  {renderPicker("gender", "Gender", suggestion.fields.gender)}
                  {renderPicker("age", "Age", suggestion.fields.age)}
                  {renderPicker("bodyType", "Body type + skin tone", suggestion.fields.bodyType)}
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    {bodyTypeHint(Number(values.bodyType))}
                  </p>
                  {renderPicker("height", "Height", suggestion.fields.height)}
                  {renderPicker("faceShape", "Face shape", suggestion.fields.faceShape)}
                  {renderPicker("hair", "Hair", suggestion.fields.hair)}
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="handle" className="text-sm font-medium">
                      Social handle
                    </label>
                    <input
                      id="handle"
                      className={inputClass}
                      {...personaForm.register("handle", {
                        onBlur: (e) => recordFieldEdit("handle", e.target.value),
                      })}
                    />
                  </div>
                  <div>
                    <label htmlFor="gender" className="text-sm font-medium">
                      Gender
                    </label>
                    <select
                      id="gender"
                      className={inputClass}
                      {...personaForm.register("gender")}
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="nonbinary">Non-binary</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="age" className="text-sm font-medium">
                      Age
                    </label>
                    <input
                      id="age"
                      type="number"
                      min={18}
                      max={80}
                      className={inputClass}
                      {...personaForm.register("age", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="bodyType" className="text-sm font-medium">
                      Body type + skin tone
                    </label>
                    <input
                      id="bodyType"
                      type="range"
                      min={0}
                      max={100}
                      className="mt-3 w-full"
                      {...personaForm.register("bodyType", {
                        valueAsNumber: true,
                        onChange: (e) =>
                          recordFieldEdit("bodyType", Number(e.target.value)),
                      })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {bodyTypeHint(Number(values.bodyType))}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="height" className="text-sm font-medium">
                      Height
                    </label>
                    <input id="height" className={inputClass} {...personaForm.register("height")} />
                  </div>
                  <div>
                    <label htmlFor="faceShape" className="text-sm font-medium">
                      Face shape
                    </label>
                    <input
                      id="faceShape"
                      className={inputClass}
                      {...personaForm.register("faceShape")}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="hair" className="text-sm font-medium">
                      Hair
                    </label>
                    <input id="hair" className={inputClass} {...personaForm.register("hair")} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "demographics" && (
            <div className="space-y-4">
              {suggestion ? (
                <>
                  {renderPicker("location", "Primary location", suggestion.fields.location)}
                  {renderPicker(
                    "neighborhoods",
                    "Neighborhoods + social status",
                    suggestion.fields.neighborhoods,
                  )}
                  {renderPicker(
                    "ageRangeShown",
                    "Age range shown",
                    suggestion.fields.ageRangeShown,
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="location" className="text-sm font-medium">
                      Primary location
                    </label>
                    <input
                      id="location"
                      className={inputClass}
                      {...personaForm.register("location", {
                        onBlur: (e) => recordFieldEdit("location", e.target.value),
                      })}
                    />
                  </div>
                  <div>
                    <label htmlFor="neighborhoods" className="text-sm font-medium">
                      Neighborhoods + social status
                    </label>
                    <input
                      id="neighborhoods"
                      className={inputClass}
                      {...personaForm.register("neighborhoods")}
                    />
                  </div>
                  <div>
                    <label htmlFor="ageRangeShown" className="text-sm font-medium">
                      Age range shown
                    </label>
                    <input
                      id="ageRangeShown"
                      className={inputClass}
                      {...personaForm.register("ageRangeShown")}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "cultural" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {suggestion ? (
                <>
                  {renderPicker("religion", "Religion", suggestion.fields.religion)}
                  {renderPicker("socialClass", "Social class", suggestion.fields.socialClass)}
                  {renderPicker(
                    "culturalNotes",
                    "Cultural notes",
                    suggestion.fields.culturalNotes,
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="religion" className="text-sm font-medium">
                      Religion
                    </label>
                    <input
                      id="religion"
                      className={inputClass}
                      {...personaForm.register("religion", {
                        onBlur: (e) => recordFieldEdit("religion", e.target.value),
                      })}
                    />
                  </div>
                  <div>
                    <label htmlFor="socialClass" className="text-sm font-medium">
                      Social class
                    </label>
                    <input
                      id="socialClass"
                      className={inputClass}
                      {...personaForm.register("socialClass", {
                        onBlur: (e) => recordFieldEdit("socialClass", e.target.value),
                      })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="culturalNotes" className="text-sm font-medium">
                      Cultural notes
                    </label>
                    <input
                      id="culturalNotes"
                      className={inputClass}
                      {...personaForm.register("culturalNotes")}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "wardrobe" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Outfit styling is baked into portrait and motion generation. Pick a
                look, customize details, then regenerate the portrait to apply it.
              </p>

              {suggestion
                ? renderPicker("wardrobe", "Outfit style", suggestion.fields.wardrobe)
                : null}

              <div>
                <p className="mb-2 text-sm font-medium">Quick outfit picks</p>
                <div className="flex flex-wrap gap-2">
                  {(suggestion?.fields.wardrobe ?? wardrobeQuickPicks()).map(
                    (option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant={
                          values.wardrobe === option.value ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => pickOption("wardrobe", option)}
                      >
                        {option.label}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="wardrobe" className="text-sm font-medium">
                  Outfit description
                </label>
                <textarea
                  id="wardrobe"
                  className={`${inputClass} mt-1 min-h-28`}
                  placeholder="Describe tops, bottoms, shoes, accessories, colors, and vibe…"
                  {...personaForm.register("wardrobe", {
                    onBlur: (e) => recordFieldEdit("wardrobe", e.target.value),
                  })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Tip: mention fabrics, fit, and setting (gym, office, street, evening)
                  for more consistent results.
                </p>
              </div>

              <Button
                type="button"
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                disabled={generating || hydrating}
                onClick={() => void handleGenerate()}
              >
                {generating ? (
                  <InlineLoading label="Regenerating portrait…" />
                ) : (
                  <>
                    <Shirt className="mr-2 h-4 w-4" aria-hidden />
                    Regenerate portrait with this outfit
                  </>
                )}
              </Button>
            </div>
          )}

          {activeTab === "style" && (
            <div className="space-y-4">
              {suggestion ? (
                <>
                  {renderPicker(
                    "personalityVoice",
                    "Personality + voice",
                    suggestion.fields.personalityVoice,
                  )}
                  {renderPicker(
                    "sampleQuote",
                    "Sample quote (validated against product facts)",
                    suggestion.fields.sampleQuote,
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        postLearn(
                          "approve_quote",
                          { quote: personaForm.getValues("sampleQuote") },
                          influencerId ?? undefined,
                        );
                        toast.success("Quote style saved to influencer memory");
                      }}
                    >
                      Approve quote style
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        postLearn(
                          "reject_quote",
                          { quote: personaForm.getValues("sampleQuote") },
                          influencerId ?? undefined,
                        );
                        toast.info("Quote style noted — will avoid similar phrasing");
                      }}
                    >
                      Reject quote style
                    </Button>
                  </div>
                </>
              ) : (
                <>
              <div>
                <label htmlFor="personalityVoice" className="text-sm font-medium">
                  Personality + voice
                </label>
                <textarea
                  id="personalityVoice"
                  className={`${inputClass} min-h-32`}
                  {...personaForm.register("personalityVoice")}
                />
              </div>
              <div>
                <label htmlFor="sampleQuote" className="text-sm font-medium">
                  Sample quote (validated against product facts)
                </label>
                <textarea
                  id="sampleQuote"
                  className={`${inputClass} min-h-20`}
                  {...personaForm.register("sampleQuote")}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      postLearn(
                        "approve_quote",
                        { quote: personaForm.getValues("sampleQuote") },
                        influencerId ?? undefined,
                      );
                      toast.success("Quote style saved to influencer memory");
                    }}
                  >
                    Approve quote style
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      postLearn(
                        "reject_quote",
                        { quote: personaForm.getValues("sampleQuote") },
                        influencerId ?? undefined,
                      );
                      toast.info("Quote style noted — will avoid similar phrasing");
                    }}
                  >
                    Reject quote style
                  </Button>
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === "facts" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {factFieldConfig.summary} The influencer may only cite verified
                  facts in scripts and quotes.
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-500 dark:text-violet-300"
                  onClick={() => setShowAllFactFields((value) => !value)}
                >
                  {showAllFactFields ? "Show site-tailored fields" : "Show all fields"}
                </button>
              </div>
              <div>
                <label htmlFor="productName" className="text-sm font-medium">
                  {factFieldConfig.name.label}
                </label>
                <input
                  id="productName"
                  className={inputClass}
                  placeholder={factFieldConfig.name.placeholder}
                  {...factsForm.register("name")}
                />
              </div>
              <div>
                <label htmlFor="productFeatures" className="text-sm font-medium">
                  {factFieldConfig.features.label}
                </label>
                <textarea
                  id="productFeatures"
                  className={`${inputClass} min-h-28 font-mono text-xs`}
                  placeholder={factFieldConfig.features.placeholder}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                />
                {factFieldConfig.features.hint && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {factFieldConfig.features.hint}
                  </p>
                )}
              </div>
              {shouldShowFactField("price") && (
                <div>
                  <label htmlFor="productPrice" className="text-sm font-medium">
                    {factFieldConfig.price.label}
                    {!factFieldConfig.price.show && showAllFactFields && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Optional for this site
                      </span>
                    )}
                  </label>
                  <input
                    id="productPrice"
                    className={inputClass}
                    placeholder={factFieldConfig.price.placeholder}
                    {...factsForm.register("price")}
                  />
                  {factFieldConfig.price.hint && showAllFactFields && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {factFieldConfig.price.hint}
                    </p>
                  )}
                </div>
              )}
              {shouldShowFactField("location") && (
                <div>
                  <label htmlFor="productLocation" className="text-sm font-medium">
                    {factFieldConfig.location.label}
                    {!factFieldConfig.location.show && showAllFactFields && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Optional for this site
                      </span>
                    )}
                  </label>
                  <input
                    id="productLocation"
                    className={inputClass}
                    placeholder={factFieldConfig.location.placeholder}
                    {...factsForm.register("location")}
                  />
                  {factFieldConfig.location.hint && showAllFactFields && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {factFieldConfig.location.hint}
                    </p>
                  )}
                </div>
              )}
              {shouldShowFactField("hours") && (
                <div>
                  <label htmlFor="productHours" className="text-sm font-medium">
                    {factFieldConfig.hours.label}
                    {!factFieldConfig.hours.show && showAllFactFields && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Optional for this site
                      </span>
                    )}
                  </label>
                  <input
                    id="productHours"
                    className={inputClass}
                    placeholder={factFieldConfig.hours.placeholder}
                    {...factsForm.register("hours")}
                  />
                  {factFieldConfig.hours.hint && showAllFactFields && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {factFieldConfig.hours.hint}
                    </p>
                  )}
                </div>
              )}
              {shouldShowFactField("ingredients") && (
                <div>
                  <label htmlFor="productIngredients" className="text-sm font-medium">
                    {factFieldConfig.ingredients.label}
                    {!factFieldConfig.ingredients.show && showAllFactFields && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Optional for this site
                      </span>
                    )}
                  </label>
                  <textarea
                    id="productIngredients"
                    className={`${inputClass} min-h-20 font-mono text-xs`}
                    value={ingredientsText}
                    onChange={(e) => setIngredientsText(e.target.value)}
                  />
                  {factFieldConfig.ingredients.hint && showAllFactFields && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {factFieldConfig.ingredients.hint}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "motion" && (
            <div className="space-y-5">
              <p className="text-xs text-muted-foreground">
                Turn the saved portrait into motion clips. Talk uses ElevenLabs
                voice + SadTalker lip-sync. Walk, spin, and jump use Kling
                image-to-video via Replicate.
              </p>

              {!previewImage && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                  Generate a portrait first — motion builds from that still image.
                </p>
              )}

              {capabilities && !capabilities.motionVideoAvailable && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Add REPLICATE_API_TOKEN to enable motion clips.
                </p>
              )}

              {capabilities && !capabilities.voiceAvailable && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Add ELEVENLABS_API_KEY for talking clips (walk/spin/jump still
                  work with Replicate only).
                </p>
              )}

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="motionScript" className="text-sm font-medium">
                    Talking script (fact-locked)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={scriptGenerating || !influencerId}
                      onClick={() => void handleGenerateScript("pitch")}
                    >
                      {scriptGenerating ? (
                        <InlineLoading label="Writing…" />
                      ) : (
                        <>
                          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                          AI script
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        voicePreviewLoading ||
                        !influencerId ||
                        !capabilities?.voiceAvailable
                      }
                      onClick={() => void handleVoicePreview()}
                    >
                      {voicePreviewLoading ? (
                        <InlineLoading label="Speaking…" />
                      ) : (
                        <>
                          <Volume2 className="mr-1.5 h-3.5 w-3.5" />
                          Preview voice
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <textarea
                  id="motionScript"
                  className={`${inputClass} min-h-24`}
                  value={motionScript}
                  onChange={(e) => {
                    setMotionScript(e.target.value);
                    setApprovedTalkPreview(null);
                  }}
                  placeholder="Script for Talk clips — 18–28 words, must match verified product facts"
                />
                {talkPreflight && (
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                    <p className="mb-2 font-medium text-foreground">
                      Talk preflight — {talkPreflight.wordCount} words · ~
                      {talkPreflight.estimatedDurationSec}s
                      {preflightLoading ? " (checking…)" : ""}
                    </p>
                    <ul className="space-y-1">
                      {talkPreflight.checks.map((check) => (
                        <li
                          key={check.id}
                          className={
                            check.status === "pass"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : check.status === "warn"
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-rose-700 dark:text-rose-300"
                          }
                        >
                          {check.status === "pass"
                            ? "✓"
                            : check.status === "warn"
                              ? "!"
                              : "✗"}{" "}
                          {check.label}
                          {check.detail ? ` — ${check.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                    {!talkPreflight.canRender && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={shortenLoading || !influencerId}
                        onClick={() => void handleShortenForLipsync()}
                      >
                        {shortenLoading ? (
                          <InlineLoading label="Shortening…" />
                        ) : (
                          "Shorten for lip-sync"
                        )}
                      </Button>
                    )}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {SCRIPT_PRESETS.map((preset) => (
                    <button
                      key={preset.scene}
                      type="button"
                      disabled={scriptGenerating || !influencerId}
                      onClick={() => void handleGenerateScript(preset.scene)}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition hover:border-violet-500/50 hover:bg-violet-500/5 disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {MOTION_ACTIONS.map((action) => {
                  const isTalk = action.type === "talk";
                  const talkReady =
                    isTalk &&
                    !!talkPreflight?.canRender &&
                    !!approvedTalkPreview;
                  const enabled =
                    !!previewImage &&
                    !!capabilities?.motionTypes[action.type] &&
                    !motionBusy &&
                    (!isTalk || talkReady);
                  const busy = motionLoading === action.type;

                  let disabledReason: string | undefined;
                  if (isTalk && !capabilities?.motionTypes.talk) {
                    disabledReason =
                      "Needs REPLICATE_API_TOKEN + ELEVENLABS_API_KEY";
                  } else if (!previewImage) {
                    disabledReason = "Generate a portrait first";
                  } else if (isTalk && !approvedTalkPreview) {
                    disabledReason = "Preview voice first";
                  } else if (isTalk && talkPreflight && !talkPreflight.canRender) {
                    disabledReason = "Fix script length in preflight";
                  }

                  return (
                    <button
                      key={action.type}
                      type="button"
                      disabled={!enabled && !busy}
                      title={disabledReason}
                      onClick={() => {
                        if (isTalk) void handleMotion("talk");
                        else void handleMotion(action.type);
                      }}
                      className={`rounded-xl border px-3 py-4 text-left transition-colors ${
                        busy
                          ? "border-violet-500 bg-violet-500/10"
                          : enabled
                            ? "border-border bg-card hover:border-violet-500/50 hover:bg-muted/50"
                            : "cursor-not-allowed border-border/60 bg-muted/30 opacity-60"
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {busy ? (
                          <InlineLoading label={action.label} />
                        ) : (
                          action.label
                        )}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                        {disabledReason ?? action.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {approvedTalkPreview && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
                  Voice preview approved (~{approvedTalkPreview.durationSec}s).
                  Final Talk clip will use this exact audio for lip-sync.
                </div>
              )}

              {voiceAudio && !motionVideo && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Latest voice track
                  </p>
                  <audio
                    key={voiceAudio}
                    ref={voiceAudioRef}
                    controls
                    preload="auto"
                    src={voiceAudio}
                    className="w-full"
                  />
                </div>
              )}

              {motionVideo && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Latest motion clip
                    {motionLoading === "talk" ? "" : " — play for synced audio"}
                  </p>
                  <video
                    src={motionVideo}
                    controls
                    playsInline
                    className="mx-auto max-h-80 w-full rounded-lg bg-black object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "library" && (
            <InfluencerRenderLibrary
              key={`${influencerId ?? "new"}-${renderLibraryTick}`}
              influencerId={influencerId}
              onApply={handleApplyRender}
            />
          )}

          {activeTab === "site-content" && (
            <InfluencerSiteContentPanel
              influencerId={influencerId}
              hasPortrait={!!previewImage}
              onAvatarSpeak={handleAvatarSpeak}
              voiceAvailable={!!capabilities?.voiceAvailable}
            />
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {quoteValidation && quoteValidation.length > 0 && (
            <ul className="text-sm text-destructive" role="alert">
              {quoteValidation.map((v) => (
                <li key={v}>• {v}</li>
              ))}
            </ul>
          )}

          {activeTab !== "site-content" &&
            activeTab !== "motion" &&
            activeTab !== "library" && (
            <Button
              type="submit"
              disabled={generating || hydrating}
              aria-busy={generating}
              className="w-full py-6 text-base font-bold"
            >
              {generating ? (
                <InlineLoading label="Generating portrait…" />
              ) : (
                "Generate fact-locked influencer portrait"
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={handleSave}
            className="w-full py-3 sm:hidden"
          >
            Save influencer
          </Button>
        </div>

        <div className="lg:sticky lg:top-6 lg:col-span-5 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/80 px-4 py-3 text-xs">
              <span className="font-medium text-foreground">
                Live preview · @{values.handle}
              </span>
              <div className="flex items-center gap-2">
                {motionVideo && (
                  <div className="flex rounded-md border border-border bg-background p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("portrait")}
                      className={`rounded px-2 py-1 text-[10px] font-medium ${
                        previewMode === "portrait"
                          ? "bg-violet-600 text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("motion")}
                      className={`rounded px-2 py-1 text-[10px] font-medium ${
                        previewMode === "motion"
                          ? "bg-violet-600 text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      Motion
                    </button>
                  </div>
                )}
                <Camera className="h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
            </div>

            <div className="bg-gradient-to-b from-muted/40 to-muted/10 p-4 sm:p-6">
              <div className="relative mx-auto w-full max-w-[280px]">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-muted shadow-inner">
                  {hydrating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                      <LoadingSkeleton className="h-full w-full rounded-none" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-[2px]">
                        <Spinner size="md" className="border-violet-600" />
                        <p className="text-sm font-medium text-foreground">
                          Loading persona…
                        </p>
                      </div>
                    </div>
                  ) : previewMode === "motion" && motionVideo ? (
                    <video
                      src={motionVideo}
                      controls
                      playsInline
                      autoPlay
                      loop
                      muted
                      className="h-full w-full object-cover object-top"
                    />
                  ) : previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt={`Generated portrait of ${values.displayName}`}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="relative flex h-full flex-col items-center justify-center bg-gradient-to-b from-muted/40 to-muted px-5 text-center">
                      <span
                        className="absolute left-4 top-4 h-5 w-5 border-l border-t border-muted-foreground/30"
                        aria-hidden
                      />
                      <span
                        className="absolute right-4 top-4 h-5 w-5 border-r border-t border-muted-foreground/30"
                        aria-hidden
                      />
                      <span
                        className="absolute bottom-4 left-4 h-5 w-5 border-b border-l border-muted-foreground/30"
                        aria-hidden
                      />
                      <span
                        className="absolute bottom-4 right-4 h-5 w-5 border-b border-r border-muted-foreground/30"
                        aria-hidden
                      />
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                        <span className="text-2xl font-semibold tracking-tight text-muted-foreground">
                          {personaInitials(values.displayName)}
                        </span>
                      </div>
                      <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Portrait preview
                      </p>
                      <p className="mt-2 text-sm leading-snug text-foreground">
                        {previewSummary}
                      </p>
                      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {values.sampleQuote}
                      </p>
                    </div>
                  )}

                  {(generating || motionBusy) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/75 px-4 text-center backdrop-blur-sm">
                      <Spinner size="lg" className="border-violet-600" />
                      <p className="mt-4 text-sm font-semibold text-foreground">
                        {motionBusy
                          ? `Rendering ${motionLoading} clip…`
                          : `Generating ${values.displayName}…`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {motionBusy
                          ? "Usually 1–3 minutes on Replicate"
                          : "Portrait generation in progress"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {previewImage && !hydrating && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      voicePreviewLoading ||
                      !influencerId ||
                      !capabilities?.voiceAvailable ||
                      motionBusy
                    }
                    onClick={() => void handleVoicePreview(values.sampleQuote)}
                  >
                    <Volume2 className="mr-1.5 h-3.5 w-3.5" />
                    Hear quote
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !capabilities?.motionTypes.wave || motionBusy || !influencerId
                    }
                    onClick={() => void handleMotion("wave")}
                  >
                    <Hand className="mr-1.5 h-3.5 w-3.5" />
                    Wave
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !capabilities?.motionTypes.talk ||
                      motionBusy ||
                      !influencerId ||
                      !approvedTalkPreview ||
                      !talkPreflight?.canRender
                    }
                    onClick={() => void handleMotion("talk")}
                  >
                    <Mic className="mr-1.5 h-3.5 w-3.5" />
                    Talk
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !capabilities?.motionTypes.point || motionBusy || !influencerId
                    }
                    onClick={() => void handleMotion("point")}
                  >
                    <Pointer className="mr-1.5 h-3.5 w-3.5" />
                    Point
                  </Button>
                </div>
              )}

              {voiceAudio && (
                <audio
                  key={`preview-${voiceAudio}`}
                  ref={previewVoiceAudioRef}
                  src={voiceAudio}
                  preload="auto"
                  className="mt-3 w-full"
                  controls
                />
              )}

              <div className="mt-4 space-y-2 rounded-lg border border-border bg-card/80 p-3 text-xs">
                <p className="border-l-2 border-violet-500/40 pl-3 leading-relaxed text-muted-foreground">
                  {previewSummary}
                </p>
                <p className="border-t border-border pt-2 text-center text-emerald-600 dark:text-emerald-400">
                  {motionBusy
                    ? `Motion clip (${motionLoading}) rendering…`
                    : generating
                      ? "AI is rendering your influencer portrait…"
                      : motionVideo
                        ? "Motion clip saved — use in Content Studio or keep interacting"
                        : status === "success"
                          ? "Portrait ready — wave, talk, or pitch from Motion tab"
                          : `Complete ${factsTabTitle}, then generate`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-10 hidden sm:block">
        <Button type="button" variant="secondary" size="sm" onClick={handleSave}>
          Save influencer
        </Button>
      </div>
    </div>
  );
}