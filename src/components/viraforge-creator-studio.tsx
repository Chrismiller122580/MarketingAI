"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  creatorAvatarSchema,
  defaultCreatorAvatarValues,
  type CreatorAvatarForm,
} from "@/lib/schemas/creator-avatar-schema";
import { buildAvatarPreviewSummary } from "@/lib/viraforge/avatar-prompts";

type CreatorTab = "physical" | "demographics" | "cultural" | "style";

const TABS: { id: CreatorTab; label: string }[] = [
  { id: "physical", label: "Physical" },
  { id: "demographics", label: "Location + Age" },
  { id: "cultural", label: "Culture + Class" },
  { id: "style", label: "Personality + Voice" },
];

const BODY_TYPE_HINTS: Record<number, string> = {
  0: "Slim",
  25: "Lean athletic",
  50: "Athletic",
  65: "Fit toned • Medium olive",
  75: "Curvy athletic",
  100: "Muscular",
};

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

export function ViraForgeCreatorStudio() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<CreatorTab>("physical");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<CreatorAvatarForm>({
    resolver: zodResolver(creatorAvatarSchema),
    defaultValues: defaultCreatorAvatarValues,
  });

  const watched = useWatch({ control: form.control });
  const values = { ...defaultCreatorAvatarValues, ...watched };
  const generating = status === "loading";
  const previewSummary = buildAvatarPreviewSummary(values);

  const handleGenerate = form.handleSubmit(async (data) => {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/creator-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = (await res.json()) as {
        error?: string;
        imageUrl?: string;
      };

      if (!res.ok) {
        throw new Error(payload.error ?? "Generation failed");
      }

      if (payload.imageUrl) {
        setPreviewImage(payload.imageUrl);
      }

      setStatus("success");
      toast.success(
        `Avatar generated for ${data.displayName}. Preview updated and ready for campaigns.`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not generate avatar";
      setStatus("error");
      setError(message);
      toast.error(message);
    }
  });

  const handleSave = () => {
    const data = form.getValues();
    try {
      localStorage.setItem(
        "viraforge-creator-draft",
        JSON.stringify({ ...data, previewImage, savedAt: new Date().toISOString() }),
      );
      toast.success("Draft saved locally. Database persistence coming soon.");
    } catch {
      toast.error("Could not save draft.");
    }
  };

  const inputClass =
    "mt-2 w-full rounded-lg border border-border bg-muted p-3 text-sm text-foreground";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
              ViraForge
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
              BETA
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Create New Influencer Avatar
          </h2>
          <p className="text-sm text-muted-foreground">
            Hyper-realistic portraits grounded in your persona fields. Video and
            voice integrations coming next.
          </p>
          {session?.user?.name && (
            <p className="mt-1 text-xs text-muted-foreground">
              Signed in as {session.user.name}
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          aria-busy={generating}
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-base font-semibold hover:from-violet-500 hover:to-fuchsia-500"
        >
          {generating
            ? `Forging ${values.displayName}...`
            : "Generate Avatar Package"}
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
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
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
            <div
              role="tabpanel"
              id="panel-physical"
              aria-labelledby="tab-physical"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2"
            >
              <div>
                <label htmlFor="displayName" className="text-sm font-medium">
                  Display name
                </label>
                <input
                  id="displayName"
                  className={inputClass}
                  {...form.register("displayName")}
                />
                {form.formState.errors.displayName && (
                  <p className="mt-1 text-xs text-destructive" role="alert">
                    {form.formState.errors.displayName.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="handle" className="text-sm font-medium">
                  Social handle
                </label>
                <input
                  id="handle"
                  className={inputClass}
                  {...form.register("handle")}
                />
              </div>
              <div>
                <label htmlFor="gender" className="text-sm font-medium">
                  Gender
                </label>
                <select id="gender" className={inputClass} {...form.register("gender")}>
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
                  {...form.register("age")}
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
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={values.bodyType}
                  {...form.register("bodyType")}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {bodyTypeHint(Number(values.bodyType))}
                </p>
              </div>
              <div>
                <label htmlFor="height" className="text-sm font-medium">
                  Height
                </label>
                <input id="height" className={inputClass} {...form.register("height")} />
              </div>
              <div>
                <label htmlFor="faceShape" className="text-sm font-medium">
                  Face shape
                </label>
                <input
                  id="faceShape"
                  className={inputClass}
                  {...form.register("faceShape")}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="hair" className="text-sm font-medium">
                  Hair
                </label>
                <input id="hair" className={inputClass} {...form.register("hair")} />
              </div>
              <Button type="button" variant="outline" className="sm:col-span-2">
                Upload reference photo (coming soon)
              </Button>
            </div>
          )}

          {activeTab === "demographics" && (
            <div
              role="tabpanel"
              id="panel-demographics"
              aria-labelledby="tab-demographics"
              className="space-y-4"
            >
              <div>
                <label htmlFor="location" className="text-sm font-medium">
                  Primary location
                </label>
                <input
                  id="location"
                  className={inputClass}
                  {...form.register("location")}
                />
              </div>
              <div>
                <label htmlFor="neighborhoods" className="text-sm font-medium">
                  Neighborhoods + social status
                </label>
                <input
                  id="neighborhoods"
                  className={inputClass}
                  {...form.register("neighborhoods")}
                />
              </div>
              <div>
                <label htmlFor="ageRangeShown" className="text-sm font-medium">
                  Age range shown
                </label>
                <input
                  id="ageRangeShown"
                  className={inputClass}
                  {...form.register("ageRangeShown")}
                />
              </div>
            </div>
          )}

          {activeTab === "cultural" && (
            <div
              role="tabpanel"
              id="panel-cultural"
              aria-labelledby="tab-cultural"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div>
                <label htmlFor="religion" className="text-sm font-medium">
                  Religion
                </label>
                <input
                  id="religion"
                  className={inputClass}
                  {...form.register("religion")}
                />
              </div>
              <div>
                <label htmlFor="socialClass" className="text-sm font-medium">
                  Social class
                </label>
                <input
                  id="socialClass"
                  className={inputClass}
                  {...form.register("socialClass")}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="culturalNotes" className="text-sm font-medium">
                  Cultural notes
                </label>
                <input
                  id="culturalNotes"
                  className={inputClass}
                  {...form.register("culturalNotes")}
                />
              </div>
              <Button type="button" variant="secondary" className="sm:col-span-2">
                Lock facts only — validation coming soon
              </Button>
            </div>
          )}

          {activeTab === "style" && (
            <div
              role="tabpanel"
              id="panel-style"
              aria-labelledby="tab-style"
              className="space-y-4"
            >
              <div>
                <label htmlFor="personalityVoice" className="text-sm font-medium">
                  Personality + voice
                </label>
                <textarea
                  id="personalityVoice"
                  className={`${inputClass} min-h-32`}
                  {...form.register("personalityVoice")}
                />
              </div>
              <div>
                <label htmlFor="sampleQuote" className="text-sm font-medium">
                  Sample quote
                </label>
                <textarea
                  id="sampleQuote"
                  className={`${inputClass} min-h-20`}
                  {...form.register("sampleQuote")}
                />
              </div>
              <Button type="button" variant="secondary">
                Preview voice with ElevenLabs (coming soon)
              </Button>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={generating}
            aria-busy={generating}
            className="w-full py-6 text-base font-bold"
          >
            Generate fact-locked influencer portrait
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Portrait uses OpenAI or xAI when API keys are configured. Video and
            voice pipelines are not wired yet.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card lg:col-span-5">
          <div className="flex items-center justify-between border-b border-border bg-muted p-3 text-xs">
            <span>
              Live preview • @{values.handle}
            </span>
            <Camera className="h-4 w-4" aria-hidden />
          </div>
          <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20">
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt={`Generated portrait of ${values.displayName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="px-4 text-center">
                <div className="mb-2 text-5xl" aria-hidden>
                  👩‍🦰
                </div>
                <p className="font-semibold text-foreground">{previewSummary}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  &quot;{values.sampleQuote}&quot;
                </p>
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 bg-background/80"
              disabled
            >
              Generate 15s reel (coming soon)
            </Button>
          </div>
          <p className="p-3 text-center text-xs text-emerald-600 dark:text-emerald-400">
            {status === "success"
              ? "Portrait generated — consistent face lock ready for campaigns"
              : "Configure persona fields, then generate a portrait preview"}
          </p>
        </div>
      </form>

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() =>
          toast("Product fact form + campaign scheduler coming in the next release.")
        }
      >
        Next: locked product fact form + schedule posts
      </Button>

      <div className="fixed bottom-4 right-4 z-10">
        <Button type="button" variant="secondary" size="sm" onClick={handleSave}>
          Save draft
        </Button>
      </div>
    </div>
  );
}