"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Mic, Presentation, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSite } from "@/context/site-context";
import { ENTERPRISE_PLUS_LABEL, isEnterprisePlusPlan } from "@/lib/plans";
import type { Platform } from "@/lib/types";
import { InlineLoading } from "./loading-indicator";

type InfluencerOption = {
  id: string;
  displayName: string;
  handle: string;
  hasPortrait: boolean;
};

type PresentResult = {
  content?: { text: string };
  script?: string;
  motionJobId?: string;
  contentStudioUrl?: string;
  creatorStudioUrl?: string;
  talkError?: string;
  talkSkipped?: string;
  error?: string;
};

export function AvatarPresentPanel() {
  const { data: session } = useSession();
  const { site } = useSite();

  const userPlan = (session?.user?.plan as string) || "free";
  const isAdmin = session?.user?.role === "admin";
  const hasAccess = isAdmin || isEnterprisePlusPlan(userPlan);

  const [influencers, setInfluencers] = useState<InfluencerOption[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState("");
  const [selectedPage, setSelectedPage] = useState("/");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [talkNow, setTalkNow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PresentResult | null>(null);

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
    if (site?.pages[0]?.path) {
      setSelectedPage(site.pages[0].path);
    }
  }, [site?.domain]);

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
          talkNow,
          site,
        }),
      });
      const data = (await res.json()) as PresentResult;
      if (!res.ok) throw new Error(data.error ?? "Presentation failed");

      setResult(data);
      if (data.motionJobId) {
        toast.success("Avatar is presenting — talk clip rendering");
      } else if (data.talkSkipped || data.talkError) {
        toast.warning(data.talkSkipped ?? data.talkError ?? "Talk skipped");
      } else {
        toast.success("Draft and script ready");
      }
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
          One-click pipeline: fact-locked post draft, spoken script, optional
          talk clip, then handoff to Content Studio. Requires{" "}
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
          Draft fact-locked copy in your influencer&apos;s voice, generate a
          spoken script, optionally render a talk clip — then publish via Content
          Studio.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
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
            <label htmlFor="presentPage" className="text-sm font-medium">
              Page
            </label>
            <select
              id="presentPage"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
            >
              {site.pages.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.path} — {p.title}
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

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={talkNow}
            onChange={(e) => setTalkNow(e.target.checked)}
            className="rounded border-border text-violet-600"
          />
          <span className="text-sm text-foreground">
            <Mic className="mr-1 inline h-3.5 w-3.5" />
            Render talk clip after drafting (lip-sync video)
          </span>
        </label>

        <Button
          type="button"
          disabled={loading || !selectedInfluencer}
          onClick={() => void handlePresent()}
          className="w-full bg-violet-600 py-5 text-base font-bold hover:bg-violet-500"
        >
          {loading ? (
            <InlineLoading label="Avatar is presenting this page…" />
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
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {result.contentStudioUrl && (
                <Button asChild size="sm" variant="default">
                  <Link href={result.contentStudioUrl}>Open in Content Studio</Link>
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