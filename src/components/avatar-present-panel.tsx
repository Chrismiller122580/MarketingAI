"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Presentation, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSite } from "@/context/site-context";
import { ENTERPRISE_PLUS_LABEL, isEnterprisePlusPlan } from "@/lib/plans";
import type { Platform } from "@/lib/types";
import {
  buildContentStudioHandoffUrl,
  writePresentHandoff,
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

type PresentResult = {
  content?: { text: string };
  script?: string;
  contentStudioUrl?: string;
  error?: string;
};

export function AvatarPresentPanel({
  influencerId,
  onScript,
}: {
  influencerId?: string;
  onScript?: (script: string) => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { site } = useSite();

  const userPlan = (session?.user?.plan as string) || "free";
  const isAdmin = session?.user?.role === "admin";
  const hasAccess = isAdmin || isEnterprisePlusPlan(userPlan);

  const [influencers, setInfluencers] = useState<InfluencerOption[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState(
    influencerId ?? "",
  );
  const [selectedPage, setSelectedPage] = useState("/");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PresentResult | null>(null);

  useEffect(() => {
    if (influencerId) setSelectedInfluencer(influencerId);
  }, [influencerId]);

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
          publicAvatars?: Array<{
            id: string;
            displayName: string;
            handle: string;
            assets?: { portraitUrl?: string };
          }>;
          lastInfluencerId?: string;
        } | null) => {
          if (!data) return;
          const options = [
            ...(data.influencers ?? []),
            ...(data.publicAvatars ?? []),
          ].map((i) => ({
            id: i.id,
            displayName: i.displayName,
            handle: i.handle,
            portraitUrl: i.assets?.portraitUrl,
            hasPortrait: !!i.assets?.portraitUrl,
          }));
          setInfluencers(options);
          setSelectedInfluencer((current) => {
            if (influencerId && options.some((o) => o.id === influencerId)) {
              return influencerId;
            }
            if (current && options.some((o) => o.id === current)) return current;
            const preferred = data.lastInfluencerId
              ? options.find((o) => o.id === data.lastInfluencerId)
              : undefined;
            return (
              preferred?.id ??
              options.find((o) => o.hasPortrait)?.id ??
              options[0]?.id ??
              ""
            );
          });
        },
      )
      .catch(() => {});
  }, [hasAccess, influencerId]);

  useEffect(() => {
    if (!site?.pages.length) return;
    const recommended = recommendSourcePage(site);
    setSelectedPage(recommended?.path ?? site.pages[0].path);
  }, [site?.domain, site?.pages.length]);

  function openInPublish(data: PresentResult, inf: InfluencerOption) {
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
      motionTypes: [],
      clips: [],
      createdAt: new Date().toISOString(),
    });
    const href =
      data.contentStudioUrl ??
      buildContentStudioHandoffUrl({
        influencerId: inf.id,
        domain: site.domain,
        pagePath: selectedPage,
        platform,
      });
    router.push(href);
  }

  async function handlePresent() {
    if (!site || !selectedInfluencer) return;

    const inf = influencers.find((i) => i.id === selectedInfluencer);
    if (inf && !inf.hasPortrait) {
      toast.error("Generate a portrait in Avatars first");
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
          talkNow: false,
          site,
        }),
      });
      const data = (await res.json()) as PresentResult;
      if (!res.ok) throw new Error(data.error ?? "Presentation failed");

      setResult(data);
      if (inf && data.content?.text && site) {
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
          motionTypes: [],
          clips: [],
          createdAt: new Date().toISOString(),
        });
      }
      if (data.script) onScript?.(data.script);
      toast.success(
        data.script
          ? "Draft ready. The spoken line is in the script below — shoot it here, then open Publish."
          : "Draft ready. Open Publish when you want to post it.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not present page");
    } finally {
      setLoading(false);
    }
  }

  if (!site) {
    return (
      <div className="rounded-xl border border-dashed border-violet-500/40 p-4 text-sm text-muted-foreground">
        Crawl a site from the header, then this avatar can write the page post.
        The clip is shot here. Publish does not render video.
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6">
        <h3 className="font-semibold text-foreground">Present a crawled page</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Writes a fact-locked post and a spoken script for this avatar. The
          clip is shot in Avatars, then published from Publish. Requires{" "}
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
          Save an avatar first, then present a crawled page from here.
        </p>
      </div>
    );
  }

  const selected = influencers.find((item) => item.id === selectedInfluencer);

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent shadow-sm">
      <div className="border-b border-violet-500/20 px-6 py-4">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-violet-600" />
          <h2 className="text-base font-semibold text-foreground">
            Present a crawled page
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Writes the caption and the spoken line. It does not render a clip —
          shoot that below, then open Publish.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="presentInfluencer" className="text-sm font-medium">
              Avatar
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
          hint="Choose which crawled page this avatar presents."
          pages={site.pages}
          value={selectedPage}
          onChange={setSelectedPage}
          valueMode="path"
          recommendedPath={recommendSourcePage(site)?.path}
          compact
        />

        <Button
          type="button"
          disabled={loading || !selectedInfluencer}
          onClick={() => void handlePresent()}
          className="w-full bg-violet-600 py-5 text-base font-bold hover:bg-violet-500"
        >
          {loading ? (
            <InlineLoading label="Writing the page post…" />
          ) : (
            <>
              <Sparkles className="mr-2 inline h-4 w-4" />
              Write the page post
            </>
          )}
        </Button>

        {result?.content?.text && selected && (
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
            <div className="border-t border-border pt-3">
              <Button
                type="button"
                size="sm"
                onClick={() => openInPublish(result, selected)}
              >
                Open in Publish
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
