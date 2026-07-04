"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Camera, Database } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading, LoadingSkeleton, Spinner } from "./loading-indicator";
import { InfluencerSiteContentPanel } from "./influencer-site-content-panel";
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
import { buildAvatarPreviewSummary } from "@/lib/viraforge/avatar-prompts";
import type {
  InfluencerAssets,
  InfluencerMotionType,
} from "@/lib/viraforge/influencer-assets";

type CreatorTab =
  | "physical"
  | "demographics"
  | "cultural"
  | "style"
  | "facts"
  | "motion"
  | "site-content";

const TABS: { id: CreatorTab; label: string }[] = [
  { id: "physical", label: "Physical" },
  { id: "demographics", label: "Location + Age" },
  { id: "cultural", label: "Culture + Class" },
  { id: "style", label: "Personality + Voice" },
  { id: "facts", label: "Product Facts" },
  { id: "motion", label: "Motion & Voice" },
  { id: "site-content", label: "Site Content" },
];

const MOTION_ACTIONS: {
  type: InfluencerMotionType;
  label: string;
  description: string;
}[] = [
  {
    type: "talk",
    label: "Talk",
    description: "ElevenLabs voice + lip-sync talking clip",
  },
  {
    type: "walk",
    label: "Walk",
    description: "Natural forward walk from portrait",
  },
  {
    type: "spin",
    label: "Spin",
    description: "Smooth 360° turn",
  },
  {
    type: "jump",
    label: "Jump",
    description: "Energetic jump motion",
  },
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
  const searchParams = useSearchParams();
  const editId = searchParams.get("influencer");

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
  const [motionLoading, setMotionLoading] = useState<InfluencerMotionType | null>(
    null,
  );
  const [previewMode, setPreviewMode] = useState<"portrait" | "motion">(
    "portrait",
  );
  const [capabilities, setCapabilities] = useState<{
    motionVideoAvailable: boolean;
    voiceAvailable: boolean;
    motionTypes: Record<InfluencerMotionType, boolean>;
  } | null>(null);

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
          personaForm.reset(match.persona);
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
            setVoiceAudio(match.assets.voiceAudioUrl);
          }
          if (match.assets?.lastScript) {
            setMotionScript(match.assets.lastScript);
          } else if (match.persona.sampleQuote) {
            setMotionScript(match.persona.sampleQuote);
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
    fetch("/api/creator-studio/capabilities")
      .then((r) => r.json())
      .then((data) => setCapabilities(data))
      .catch(() => setCapabilities(null));
  }, []);

  const pollMotionJob = useCallback(
    async (jobId: string, motionType: InfluencerMotionType) => {
      const maxAttempts = 90;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const res = await fetch(`/api/creator-studio/motion/status/${jobId}`);
        const data = (await res.json()) as {
          status?: string;
          videoUrl?: string;
          voiceAudioUrl?: string;
          error?: string;
        };

        if (data.status === "ready" && data.videoUrl) {
          setMotionVideo(data.videoUrl);
          setPreviewMode("motion");
          if (data.voiceAudioUrl) setVoiceAudio(data.voiceAudioUrl);
          setMotionLoading(null);
          toast.success(
            motionType === "talk"
              ? "Talking clip ready — lip-sync video saved."
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
    [],
  );

  const handleMotion = async (motionType: InfluencerMotionType) => {
    if (!previewImage) {
      toast.error("Generate a portrait before motion clips");
      setActiveTab("physical");
      return;
    }

    if (!influencerId) {
      toast.error("Save the influencer first so motion clips can be stored");
      return;
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
          script: motionType === "talk" ? motionScript : undefined,
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

      if (payload.voiceAudioUrl) setVoiceAudio(payload.voiceAudioUrl);
      if (payload.jobId) void pollMotionJob(payload.jobId, motionType);
      else setMotionLoading(null);
    } catch (err) {
      setMotionLoading(null);
      toast.error(err instanceof Error ? err.message : "Motion failed");
    }
  };

  const recordFieldEdit = (field: string, value: unknown) => {
    postLearn("field_edit", { field, value }, influencerId ?? undefined);
  };

  const parseFacts = (): ProductFactsForm => {
    const base = factsForm.getValues();
    return {
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
  };

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

  const handleGenerate = personaForm.handleSubmit(async (persona) => {
    setStatus("loading");
    setError(null);
    setQuoteValidation(null);

    const productFacts = parseFacts();
    const factsParsed = productFactsSchema.safeParse(productFacts);
    if (!factsParsed.success) {
      setStatus("error");
      setError("Complete the Product Facts tab before generating");
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
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
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
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generating || hydrating}
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
      </div>

      <form onSubmit={handleGenerate} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 lg:col-span-7">
          <div
            role="tablist"
            aria-label="Avatar configuration"
            className="flex flex-wrap gap-2 border-b border-border pb-4"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-violet-600 text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "physical" && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="displayName" className="text-sm font-medium">
                  Display name
                </label>
                <input
                  id="displayName"
                  className={inputClass}
                  {...personaForm.register("displayName", {
                    onBlur: (e) => recordFieldEdit("displayName", e.target.value),
                  })}
                />
              </div>
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
            </div>
          )}

          {activeTab === "demographics" && (
            <div className="space-y-4">
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
            </div>
          )}

          {activeTab === "cultural" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>
          )}

          {activeTab === "style" && (
            <div className="space-y-4">
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
            </div>
          )}

          {activeTab === "facts" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Structured fields only — the influencer may only cite these verified
                facts in scripts and quotes.
              </p>
              <div>
                <label htmlFor="productName" className="text-sm font-medium">
                  Product name
                </label>
                <input
                  id="productName"
                  className={inputClass}
                  {...factsForm.register("name")}
                />
              </div>
              <div>
                <label htmlFor="productPrice" className="text-sm font-medium">
                  Price
                </label>
                <input
                  id="productPrice"
                  className={inputClass}
                  {...factsForm.register("price")}
                />
              </div>
              <div>
                <label htmlFor="productFeatures" className="text-sm font-medium">
                  Features (one per line)
                </label>
                <textarea
                  id="productFeatures"
                  className={`${inputClass} min-h-28 font-mono text-xs`}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="productLocation" className="text-sm font-medium">
                  Business location
                </label>
                <input
                  id="productLocation"
                  className={inputClass}
                  {...factsForm.register("location")}
                />
              </div>
              <div>
                <label htmlFor="productHours" className="text-sm font-medium">
                  Hours
                </label>
                <input
                  id="productHours"
                  className={inputClass}
                  {...factsForm.register("hours")}
                />
              </div>
              <div>
                <label htmlFor="productIngredients" className="text-sm font-medium">
                  Ingredients (one per line)
                </label>
                <textarea
                  id="productIngredients"
                  className={`${inputClass} min-h-20 font-mono text-xs`}
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                />
              </div>
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
                <label htmlFor="motionScript" className="text-sm font-medium">
                  Talking script (fact-locked)
                </label>
                <textarea
                  id="motionScript"
                  className={`${inputClass} min-h-24`}
                  value={motionScript}
                  onChange={(e) => setMotionScript(e.target.value)}
                  placeholder="Script for Talk clips — must match verified product facts"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MOTION_ACTIONS.map((action) => {
                  const enabled =
                    !!previewImage &&
                    !!capabilities?.motionTypes[action.type] &&
                    !motionBusy;
                  const busy = motionLoading === action.type;

                  return (
                    <button
                      key={action.type}
                      type="button"
                      disabled={!enabled && !busy}
                      onClick={() => void handleMotion(action.type)}
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
                        {action.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {voiceAudio && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Latest voice track
                  </p>
                  <audio controls src={voiceAudio} className="w-full" />
                </div>
              )}

              {motionVideo && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Latest motion clip
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

          {activeTab === "site-content" && (
            <InfluencerSiteContentPanel
              influencerId={influencerId}
              hasPortrait={!!previewImage}
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

          {activeTab !== "site-content" && activeTab !== "motion" && (
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
                        ? "Motion clip saved to Influencer.assets.videoUrl"
                        : status === "success"
                          ? "Portrait generated — open Motion & Voice tab next"
                          : "Complete Product Facts, then generate"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <div className="fixed bottom-4 right-4 z-10">
        <Button type="button" variant="secondary" size="sm" onClick={handleSave}>
          Save influencer
        </Button>
      </div>
    </div>
  );
}