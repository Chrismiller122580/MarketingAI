"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight, Globe, Lock, Mic, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSite } from "@/context/site-context";
import { ENTERPRISE_PLUS_LABEL, isEnterprisePlusPlan } from "@/lib/plans";
import type { FactPinpoint } from "@/lib/viraforge/site-facts-extractor";
import type { Platform } from "@/lib/types";
import { InlineLoading, Spinner } from "./loading-indicator";
import { CrawledPagePicker } from "./crawled-page-picker";
import { recommendSourcePage } from "@/lib/crawled-page-utils";

type GeneratedContent = {
  text: string;
  citedFacts: FactPinpoint[];
  validation: { valid: boolean; violations: string[] };
  siteDomain: string;
  sourcePage: string;
  platform: Platform;
};

const PLATFORMS: Platform[] = [
  "instagram",
  "twitter",
  "linkedin",
  "facebook",
];

export function InfluencerSiteContentPanel({
  influencerId,
  hasPortrait,
  onAvatarSpeak,
  voiceAvailable = false,
}: {
  influencerId: string | null;
  hasPortrait: boolean;
  onAvatarSpeak?: (script: string, talkNow?: boolean) => void;
  voiceAvailable?: boolean;
}) {
  const { data: session } = useSession();
  const { site, savedSites, loadSavedSite } = useSite();

  const userPlan = (session?.user?.plan as string) || "free";
  const isAdmin = session?.user?.role === "admin";
  const hasAccess = isAdmin || isEnterprisePlusPlan(userPlan);

  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedPage, setSelectedPage] = useState("/");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [brief, setBrief] = useState("");
  const [pinpoints, setPinpoints] = useState<FactPinpoint[]>([]);
  const [loadingFacts, setLoadingFacts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<GeneratedContent | null>(null);

  const activeSite = site?.domain === selectedDomain ? site : null;
  const pages = activeSite?.pages ?? [];

  useEffect(() => {
    if (site?.domain && !selectedDomain) {
      setSelectedDomain(site.domain);
      const recommended = recommendSourcePage(site);
      setSelectedPage(recommended?.path ?? site.pages[0]?.path ?? "/");
    } else if (!selectedDomain && savedSites[0]?.domain) {
      setSelectedDomain(savedSites[0].domain);
    }
  }, [site, savedSites, selectedDomain]);

  const loadFacts = useCallback(async () => {
    if (!influencerId || !selectedDomain) return;
    setLoadingFacts(true);
    try {
      const res = await fetch("/api/creator-studio/site-facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerId,
          domain: selectedDomain,
          pagePath: selectedPage,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        pinpoints?: FactPinpoint[];
      };
      if (!res.ok) throw new Error(data.error ?? "Could not load site facts");
      setPinpoints(data.pinpoints ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load facts");
      setPinpoints([]);
    } finally {
      setLoadingFacts(false);
    }
  }, [influencerId, selectedDomain, selectedPage]);

  useEffect(() => {
    if (hasAccess && influencerId && selectedDomain) {
      void loadFacts();
    }
  }, [hasAccess, influencerId, selectedDomain, selectedPage, loadFacts]);

  async function handleDomainChange(domain: string) {
    setSelectedDomain(domain);
    setContent(null);
    await loadSavedSite(domain);
    const res = await fetch(
      `/api/db/site?domain=${encodeURIComponent(domain)}`,
    );
    const data = (await res.json()) as {
      site?: { pages?: Array<{ path: string }> };
    };
    setSelectedPage(data.site?.pages?.[0]?.path ?? "/");
  }

  async function handleGenerate() {
    if (!influencerId) {
      toast.error("Save the influencer before generating site content");
      return;
    }
    if (!selectedDomain) {
      toast.error("Select a crawled website");
      return;
    }

    setGenerating(true);
    setContent(null);
    try {
      const res = await fetch("/api/creator-studio/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerId,
          domain: selectedDomain,
          pagePath: selectedPage,
          platform,
          brief: brief.trim() || undefined,
        }),
      });
      const data = (await res.json()) as GeneratedContent & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setContent(data);
      toast.success("Influencer post drafted from crawled site facts");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate");
    } finally {
      setGenerating(false);
    }
  }

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <div>
            <h3 className="font-semibold text-foreground">
              {ENTERPRISE_PLUS_LABEL} feature
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Let your influencer avatar draft social posts from crawled websites,
              citing locked product facts and pinpointed page details — no
              invented claims.
            </p>
            <Button asChild size="sm" className="mt-4 bg-violet-600 hover:bg-violet-500">
              <Link href="/billing">Upgrade to Enterprise Plus</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Draft posts in your influencer&apos;s voice using pages from crawled sites.
        Locked product facts are merged with on-page details — cited facts are
        highlighted below.
      </p>

      {!hasPortrait && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Generate a portrait first so content matches your influencer persona.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="siteDomain" className="text-sm font-medium">
            Crawled website
          </label>
          <select
            id="siteDomain"
            className="mt-2 w-full rounded-lg border border-border bg-muted p-3 text-sm"
            value={selectedDomain}
            onChange={(e) => void handleDomainChange(e.target.value)}
          >
            <option value="">Select domain…</option>
            {savedSites.map((s) => (
              <option key={s.domain} value={s.domain}>
                {s.domain} ({s.pages} pages)
              </option>
            ))}
          </select>
          {savedSites.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No crawled sites yet.{" "}
              <Link href="/dashboard" className="text-violet-600 hover:underline">
                Crawl a domain on the dashboard
              </Link>
              .
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <CrawledPagePicker
            id="sitePage"
            label="Source page"
            hint="Filter and pick the best crawled page for this post."
            pages={pages}
            value={selectedPage}
            onChange={setSelectedPage}
            valueMode="path"
            disabled={!selectedDomain || pages.length === 0}
            recommendedPath={
              activeSite ? recommendSourcePage(activeSite)?.path : undefined
            }
            compact
          />
        </div>

        <div>
          <label htmlFor="contentPlatform" className="text-sm font-medium">
            Platform
          </label>
          <select
            id="contentPlatform"
            className="mt-2 w-full rounded-lg border border-border bg-muted p-3 text-sm"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="contentBrief" className="text-sm font-medium">
            Campaign brief (optional)
          </label>
          <input
            id="contentBrief"
            className="mt-2 w-full rounded-lg border border-border bg-muted p-3 text-sm"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Launch angle, promo, seasonal hook…"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe className="h-4 w-4 text-violet-500" />
            Pinpointed product facts
          </div>
          {loadingFacts && <Spinner size="sm" className="border-violet-600" />}
        </div>

        {pinpoints.length === 0 && !loadingFacts ? (
          <p className="text-sm text-muted-foreground">
            Select a crawled site to preview mergeable facts.
          </p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
            {pinpoints.map((pin) => (
              <li
                key={`${pin.category}-${pin.fact}`}
                className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                    pin.locked
                      ? "bg-violet-500/10 text-violet-600"
                      : "bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  {pin.locked ? "locked" : "crawl"}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{pin.fact}</p>
                  <p className="text-muted-foreground">{pin.source}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        type="button"
        disabled={generating || !influencerId || !selectedDomain}
        onClick={() => void handleGenerate()}
        className="w-full bg-violet-600 py-6 text-base font-bold hover:bg-violet-500"
      >
        {generating ? (
          <InlineLoading label="Drafting influencer post…" />
        ) : (
          <>
            <Sparkles className="mr-2 inline h-4 w-4" />
            Generate site content as influencer
          </>
        )}
      </Button>

      {influencerId && selectedDomain && (
        <Button
          asChild
          variant="outline"
          className="w-full border-violet-500/40 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
        >
          <Link
            href={`/content?influencer=${encodeURIComponent(influencerId)}&domain=${encodeURIComponent(selectedDomain)}&page=${encodeURIComponent(selectedPage)}`}
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Open in Content Studio (full pipeline)
          </Link>
        </Button>
      )}

      {content && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            {content.siteDomain}
            {content.sourcePage} · {content.platform}
            {content.validation.valid ? (
              <span className="ml-2 text-emerald-600">Facts validated</span>
            ) : (
              <span className="ml-2 text-destructive">Validation warnings</span>
            )}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {content.text}
          </p>
          {onAvatarSpeak && hasPortrait && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAvatarSpeak(content.text)}
              >
                <Volume2 className="mr-1.5 h-3.5 w-3.5" />
                Load as talk script
              </Button>
              {voiceAvailable && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-500"
                  onClick={() => onAvatarSpeak(content.text, true)}
                >
                  <Mic className="mr-1.5 h-3.5 w-3.5" />
                  Avatar says this now
                </Button>
              )}
            </div>
          )}
          {content.citedFacts.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-foreground">
                Facts cited in this post
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {content.citedFacts.map((pin) => (
                  <li key={`${pin.fact}-cite`}>
                    • {pin.fact}{" "}
                    <span className="text-[10px]">({pin.source})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!content.validation.valid && (
            <ul className="text-xs text-destructive">
              {content.validation.violations.map((v) => (
                <li key={v}>• {v}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}