"use client";

import { useCallback, useEffect, useState } from "react";
import { pollUntilComplete } from "@/hooks/use-generation-poll";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Mic, Presentation, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSite } from "@/context/site-context";
import { ENTERPRISE_PLUS_LABEL, isEnterprisePlusPlan } from "@/lib/plans";
import type { Platform } from "@/lib/types";
import type { InfluencerMotionType } from "@/lib/viraforge/influencer-assets";
import {
  DEFAULT_PRESENT_MOTION_TYPES,
  MOTION_ACTIONS,
  toggleMotionTypeSelection,
} from "@/lib/viraforge/motion-actions";
import {
  writePresentHandoff,
  type PresentHandoffClip,
} from "@/lib/viraforge/present-handoff";
import { InlineLoading } from "./loading-indicator";
import { CrawledPagePicker } from "./crawled-page-picker";
import { recommendSourcePage } from "@/lib/crawled-page-utils";

type InfluencerOption = {
  id: string;
  displayName: string;
  handle: string;
  portraitUrl?: string;
  hasPortrait: boolean;
};

type PresentClip = PresentHandoffClip & { videoUrl?: string };

type PresentResult = {
  content?: { text: string };
  script?: string;
  motionTypes?: InfluencerMotionType[];
  clips?: PresentClip[];
  motionJobId?: string;
  contentStudioUrl?: string;
  creatorStudioUrl?: string;
  talkError?: string;
  talkSkipped?: string;
  error?: string;
};

type MotionPollData = {
  status?: string;
  videoUrl?: string;
  error?: string;
};

export function AvatarPresentPanel() {
  const router = useRouter();
  const { data: session } = useSession();
  const { site } = useSite();

  const userPlan = (session?.user?.plan as string) || "free";
  const isAdmin = session?.user?.role === "admin";
  const hasAccess = isAdmin || isEnterprisePlusPlan(userPlan);

  const [influencers, setInfluencers] = useState<InfluencerOption[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState("");
  const [selectedPage, setSelectedPage] = useState("/");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [selectedMotionTypes, setSelectedMotionTypes] = useState<
    InfluencerMotionType[]
  >(DEFAULT_PRESENT_MOTION_TYPES);
  const [renderMotion, setRenderMotion] = useState(true);
  const [motionCapabilities, setMotionCapabilities] = useState<
    Record<InfluencerMotionType, boolean> | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [motionPolling, setMotionPolling] = useState(false);
  const [result, setResult] = useState<PresentResult | null>(null);

  const pollPresentMotion = useCallback(async (clips: PresentClip[]) => {
    const pending = clips.filter((clip) => clip.motionJobId);
    if (pending.length === 0) return;

    setMotionPolling(true);
    const finished = await Promise.all(
      pending.map(async (clip) => {
        const data = await pollUntilComplete<MotionPollData>({
          url: `/api/creator-studio/motion/status/${clip.motionJobId}`,
          isReady: (payload) => payload.status === "ready" && !!payload.videoUrl,
          isFailed: (payload) => payload.status === "failed",
          immediate: true,
        });
        return {
          ...clip,
          videoUrl:
            data?.status === "ready" ? data.videoUrl : clip.videoUrl,
          error: data?.status === "failed" ? data.error : undefined,
        };
      }),
    );
    setMotionPolling(false);

    setResult((prev) => (prev ? { ...prev, clips: finished } : prev));

    const readyCount = finished.filter((clip) => clip.videoUrl).length;
    const failed = finished.find((clip) => clip.error);
    if (readyCount > 0) {
      toast.success(
        readyCount === 1
          ? "Motion clip ready"
          : `${readyCount} motion clips ready`,
      );
    }
    if (failed) {
      toast.error(failed.error ?? "A motion clip failed");
    } else if (readyCount === 0) {
      toast.error("Motion clip timed out — it will keep rendering in Creator Studio");
    }
  }, []);

  useEffect(() => {
    if (!hasAccess) return;
    fetch("/api/creator-studio/capabilities")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { motionTypes?: Record<InfluencerMotionType, boolean> } | null) => {
          if (data?.motionTypes) setMotionCapabilities(data.motionTypes);
        },
      )
      .catch(() => {});
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;
    fetch("/api/creator-studio/influencers")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          influencers?: Array<{
            id: string;
            displayName: string;
            handle: string;
            assets?: { portraitUrl?: string };
          }>;
          lastInfluencerId?: string;
        } | null) => {
          if (!data?.influencers) return;
          const options = data.influencers.map((i) => ({
            id: i.id,
            displayName: i.displayName,
            handle: i.handle,
            portraitUrl: i.assets?.portraitUrl,
            hasPortrait: !!i.assets?.portraitUrl,
          }));
          setInfluencers(options);
          const preferred = data.lastInfluencerId
            ? options.find((o) => o.id === data.lastInfluencerId)
            : undefined;
          setSelectedInfluencer(
            preferred?.id ??
              options.find((o) => o.hasPortrait)?.id ??
              options[0]?.id ??
              "",
          );
        },
      )
      .catch(() => {});
  }, [hasAccess]);

  useEffect(() => {
    if (!site?.pages.length) return;
    const recommended = recommendSourcePage(site);
    setSelectedPage(recommended?.path ?? site.pages[0].path);
  }, [site?.domain, site?.pages.length]);

  function handoffToStudio(data: PresentResult, inf: InfluencerOption) {
    if (!site || !data.content?.text) return;
    writePresentHandoff({
      influencerId: inf.id,
      displayName: inf.displayName,
      handle: inf.handle,
      portraitUrl: inf.portraitUrl,
      domain: site.domain,
      pagePath: selectedPage,
      platform,
      draftText: data.content.text,
      script: data.script,
      motionTypes: data.motionTypes ?? selectedMotionTypes,
      clips: (data.clips ?? []).map((clip) => ({
        motionType: clip.motionType,
        motionJobId: clip.motionJobId,
        voiceAudioUrl: clip.voiceAudioUrl,
        script: clip.script,
      })),
      createdAt: new Date().toISOString(),
    });
    const href =
      data.contentStudioUrl ??
      `/content?influencer=${encodeURIComponent(inf.id)}`;
    router.replace(href, { scroll: false });
    requestAnimationFrame(() => {
      document
        .getElementById("content-studio")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handlePresent() {
    if (!site || !selectedInfluencer) return;

    const inf = influencers.find((i) => i.id === selectedInfluencer);
    if (inf && !inf.hasPortrait) {
      toast.error("Generate a portrait for this influencer in Creator Studio first");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/creator-studio/present", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerId: selectedInfluencer,
          domain: site.domain,
          pagePath: selectedPage,
          platform,
          talkNow: renderMotion,
          motionTypes: selectedMotionTypes,
          site,
        }),
      });
      const data = (await res.json()) as PresentResult;
      if (!res.ok) throw new Error(data.error ?? "Presentation failed");

      setResult(data);
      const labels = (data.motionTypes ?? selectedMotionTypes).join(" + ");
      if (data.clips?.length) {
        toast.success(`Avatar is presenting — rendering ${labels}`);
        void pollPresentMotion(data.clips);
      } else if (data.talkSkipped || data.talkError) {
        toast.warning(data.talkSkipped ?? data.talkError ?? "Motion skipped");
      } else {
        toast.success("Draft and script ready");
      }
      if (inf) handoffToStudio(data, inf);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not present page");
    } finally {
      setLoading(false);
    }
  }

  if (!site) return null;

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6">
        <h3 className="font-semibold text-foreground">
          Avatar presents this page
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          One-click pipeline: fact-locked post, spoken script, Walk & talk or
          close-up clip, then handoff to Content Studio. Requires{" "}
          {ENTERPRISE_PLUS_LABEL}.
        </p>
        <Button asChild size="sm" className="mt-4 bg-violet-600 hover:bg-violet-500">
          <Link href="/billing">Upgrade to Enterprise Plus</Link>
        </Button>
      </div>
    );
  }

  if (influencers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-violet-500/40 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Create an influencer in{" "}
          <Link href="/creator-studio" className="text-violet-600 hover:underline">
            Creator Studio
          </Link>{" "}
          to let your avatar present crawled pages.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent shadow-sm">
      <div className="border-b border-violet-500/20 px-6 py-4">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-violet-600" />
          <h2 className="text-base font-semibold text-foreground">
            Avatar presents this page
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Your influencer writes the post, speaks the script, and walks the
          page — then Content Studio below wraps it for publish.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="presentInfluencer" className="text-sm font-medium">
              Influencer
            </label>
            <select
              id="presentInfluencer"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={selectedInfluencer}
              onChange={(e) => setSelectedInfluencer(e.target.value)}
            >
              {influencers.map((inf) => (
                <option key={inf.id} value={inf.id}>
                  {inf.displayName} (@{inf.handle})
                  {!inf.hasPortrait ? " — needs portrait" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="presentPlatform" className="text-sm font-medium">
              Platform
            </label>
            <select
              id="presentPlatform"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            >
              <option value="instagram">Instagram</option>
              <option value="twitter">X / Twitter</option>
              <option value="linkedin">LinkedIn</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
        </div>

        <CrawledPagePicker
          id="presentPage"
          label="Page"
          hint="Choose which crawled page your avatar presents."
          pages={site.pages}
          value={selectedPage}
          onChange={setSelectedPage}
          valueMode="path"
          recommendedPath={recommendSourcePage(site)?.path}
          compact
        />

        <div>
          <p className="text-sm font-medium">Shot</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick up to 2. Walk & talk is the default for presenting a page —
            close-up Talk is still here when you want a talking head.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MOTION_ACTIONS.map((action) => {
              const selected = selectedMotionTypes.includes(action.type);
              const enabled = motionCapabilities?.[action.type] ?? true;
              return (
                <button
                  key={action.type}
                  type="button"
                  disabled={!enabled || !renderMotion}
                  onClick={() =>
                    setSelectedMotionTypes((prev) =>
                      toggleMotionTypeSelection(prev, action.type),
                    )
                  }
                  className={`rounded-lg border px-2.5 py-2 text-left transition ${
                    selected
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                      : enabled
                        ? "border-border bg-background hover:border-violet-300"
                        : "cursor-not-allowed border-border/60 opacity-50"
                  }`}
                >
                  <p className="text-xs font-semibold text-foreground">
                    {action.label}
                    {selected ? " ✓" : ""}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={renderMotion}
            onChange={(e) => setRenderMotion(e.target.checked)}
            className="rounded border-border text-violet-600"
          />
          <span className="text-sm text-foreground">
            <Mic className="mr-1 inline h-3.5 w-3.5" />
            Render motion clip(s) with lip-sync where needed
          </span>
        </label>

        <Button
          type="button"
          disabled={loading || motionPolling || !selectedInfluencer}
          onClick={() => void handlePresent()}
          className="w-full bg-violet-600 py-5 text-base font-bold hover:bg-violet-500"
        >
          {loading || motionPolling ? (
            <InlineLoading
              label={
                motionPolling
                  ? "Rendering motion clip…"
                  : "Avatar is presenting this page…"
              }
            />
          ) : (
            <>
              <Sparkles className="mr-2 inline h-4 w-4" />
              Avatar presents this page
            </>
          )}
        </Button>

        {result?.content?.text && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium text-foreground">Draft post</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {result.content.text}
            </p>
            {result.script && (
              <>
                <p className="border-t border-border pt-3 font-medium text-foreground">
                  Spoken script
                </p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {result.script}
                </p>
              </>
            )}
            {result.clips?.some((clip) => clip.videoUrl) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {result.clips
                  .filter((clip) => clip.videoUrl)
                  .map((clip) => (
                    <div key={clip.motionJobId}>
                      <p className="mb-1 text-xs font-medium capitalize text-foreground">
                        {clip.motionType.replace("-", " ")}
                      </p>
                      <video
                        src={clip.videoUrl}
                        controls
                        playsInline
                        className="w-full rounded-lg border border-border"
                      />
                    </div>
                  ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {result.contentStudioUrl && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const inf = influencers.find(
                      (item) => item.id === selectedInfluencer,
                    );
                    if (inf) handoffToStudio(result, inf);
                  }}
                >
                  Use in Content Studio
                </Button>
              )}
              {result.creatorStudioUrl && (
                <Button asChild size="sm" variant="outline">
                  <Link href={result.creatorStudioUrl}>Creator Studio</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
