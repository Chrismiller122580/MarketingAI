"use client";

import { useCallback, useEffect, useState } from "react";
import { History, ImageIcon, Mic, FileText, Film } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoading, Spinner } from "./loading-indicator";
import type { InfluencerAssets } from "@/lib/viraforge/influencer-assets";

export type SavedRender = {
  id: string;
  type: "portrait" | "motion" | "voice" | "script" | "site_content" | "merged";
  status: string;
  url: string | null;
  voiceUrl: string | null;
  motionType: string | null;
  script: string | null;
  isActive: boolean;
  error: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<SavedRender["type"], string> = {
  portrait: "Portrait",
  motion: "Motion",
  voice: "Voice",
  script: "Script",
  site_content: "Site copy",
  merged: "Merged reel",
};

function typeIcon(type: SavedRender["type"]) {
  switch (type) {
    case "portrait":
      return ImageIcon;
    case "motion":
    case "merged":
      return Film;
    case "voice":
      return Mic;
    case "script":
    case "site_content":
      return FileText;
    default:
      return History;
  }
}

export function InfluencerRenderLibrary({
  influencerId,
  onApply,
}: {
  influencerId: string | null;
  onApply: (assets: InfluencerAssets, render: SavedRender) => void;
}) {
  const [renders, setRenders] = useState<SavedRender[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const loadRenders = useCallback(async () => {
    if (!influencerId) {
      setRenders([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/creator-studio/influencers/${influencerId}/renders`,
      );
      const data = (await res.json()) as { renders?: SavedRender[] };
      setRenders(data.renders ?? []);
    } catch {
      setRenders([]);
    } finally {
      setLoading(false);
    }
  }, [influencerId]);

  useEffect(() => {
    void loadRenders();
  }, [loadRenders]);

  async function handleActivate(render: SavedRender) {
    if (!influencerId || render.status !== "ready") return;
    if (render.type === "script" || render.type === "site_content") {
      if (render.script) {
        onApply({}, render);
        toast.success("Loaded saved copy into the studio");
      }
      return;
    }

    setActivatingId(render.id);
    try {
      const res = await fetch(
        `/api/creator-studio/influencers/${influencerId}/renders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ renderId: render.id }),
        },
      );
      const data = (await res.json()) as {
        assets?: InfluencerAssets;
        error?: string;
      };
      if (!res.ok || !data.assets) {
        toast.error(data.error ?? "Failed to apply render");
        return;
      }
      onApply(data.assets, render);
      await loadRenders();
      toast.success(`${TYPE_LABELS[render.type]} applied to profile`);
    } catch {
      toast.error("Failed to apply render");
    } finally {
      setActivatingId(null);
    }
  }

  if (!influencerId) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
        Save the influencer first — every portrait, motion clip, voice preview,
        and script will be stored here for reuse.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          All generations are saved. Pick any past render to restore it as the
          active avatar profile.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadRenders()}
          disabled={loading}
        >
          {loading ? <InlineLoading label="Refreshing…" /> : "Refresh"}
        </Button>
      </div>

      {loading && renders.length === 0 ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" className="border-violet-600" />
        </div>
      ) : renders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No saved renders yet. Generate a portrait or motion clip to start
          building your library.
        </p>
      ) : (
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {renders.map((render) => {
            const Icon = typeIcon(render.type);
            const label =
              render.type === "motion" && render.motionType
                ? `${TYPE_LABELS.motion} · ${render.motionType}`
                : TYPE_LABELS[render.type];

            return (
              <li
                key={render.id}
                className={`rounded-lg border p-3 ${
                  render.isActive
                    ? "border-violet-500/50 bg-violet-500/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {render.type === "portrait" && render.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={render.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : render.type === "motion" && render.url ? (
                      <video
                        src={render.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {label}
                      </p>
                      {render.isActive && (
                        <span className="rounded-full bg-violet-600/15 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                          Active
                        </span>
                      )}
                      {render.status === "failed" && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          Failed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(render.createdAt).toLocaleString()}
                    </p>
                    {render.script && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {render.script}
                      </p>
                    )}
                    {render.error && (
                      <p className="mt-1 text-xs text-destructive">
                        {render.error}
                      </p>
                    )}
                    {render.voiceUrl && render.type === "motion" && (
                      <audio
                        controls
                        src={render.voiceUrl}
                        className="mt-2 h-8 w-full"
                      />
                    )}
                  </div>
                </div>

                {render.status === "ready" &&
                  (render.type === "portrait" ||
                    render.type === "motion" ||
                    render.type === "voice" ||
                    render.script) && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-3 w-full"
                      disabled={activatingId === render.id || render.isActive}
                      onClick={() => void handleActivate(render)}
                    >
                      {activatingId === render.id ? (
                        <InlineLoading label="Applying…" />
                      ) : render.isActive ? (
                        "Currently active"
                      ) : render.type === "script" ||
                        render.type === "site_content" ? (
                        "Load copy"
                      ) : (
                        "Use for profile"
                      )}
                    </Button>
                  )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}