"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Text } from "react-konva";
import type Konva from "konva";
import { getPlatformSize } from "@/lib/platform-sizes";
import type {
  GeneratedPost,
  ImageOverlayImageLayer,
  ImageOverlayLayer,
  ImageOverlayTextLayer,
  PostMedia,
  SavedPost,
} from "@/lib/types";

type VisualPostEditorProps = {
  post: GeneratedPost | SavedPost;
  postId: string;
  brandName: string;
  themeColor: string;
  onSave: (image: PostMedia) => void;
  onClose: () => void;
};

function useHtmlImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
  }, [src]);
  return image;
}

function layerId() {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultLayers(
  post: GeneratedPost,
  brandName: string,
  themeColor: string,
  canvasW: number,
  canvasH: number,
): ImageOverlayLayer[] {
  const headline: ImageOverlayTextLayer = {
    type: "text",
    id: layerId(),
    text: post.text.split("\n")[0]?.slice(0, 80) || brandName,
    x: 48,
    y: canvasH > 900 ? 80 : 48,
    fontSize: canvasW > 900 ? 52 : 36,
    color: "#ffffff",
    fontFamily: "system-ui, sans-serif",
    fontStyle: "bold",
    width: canvasW - 96,
    align: "left",
  };

  if (post.cta) {
    const cta: ImageOverlayTextLayer = {
      type: "text",
      id: layerId(),
      text: post.cta.replace(/^→\s*/, "").slice(0, 40),
      x: 48,
      y: canvasH - (canvasH > 900 ? 160 : 120),
      fontSize: 24,
      color: themeColor.startsWith("#") ? themeColor : `#${themeColor}`,
      fontFamily: "system-ui, sans-serif",
      fontStyle: "bold",
      width: canvasW - 96,
      align: "left",
    };
    return [headline, cta];
  }

  return [headline];
}

export function VisualPostEditor({
  post,
  postId,
  brandName,
  themeColor,
  onSave,
  onClose,
}: VisualPostEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const size = getPlatformSize(post.platform);
  const displayScale = Math.min(560 / size.width, 480 / size.height, 1);

  const baseUrl =
    post.image.originalBaseUrl ?? post.image.originalUrl ?? post.image.url;
  const baseImage = useHtmlImage(baseUrl);

  const [layers, setLayers] = useState<ImageOverlayLayer[]>(
    post.image.overlays?.length
      ? post.image.overlays
      : defaultLayers(post, brandName, themeColor, size.width, size.height),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLayer = useCallback(
    (id: string, patch: Partial<ImageOverlayTextLayer | ImageOverlayImageLayer>) => {
      setLayers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch } as ImageOverlayLayer : l)),
      );
    },
    [],
  );

  function addTextLayer() {
    const layer: ImageOverlayTextLayer = {
      type: "text",
      id: layerId(),
      text: "Your text",
      x: 60,
      y: size.height / 2,
      fontSize: 32,
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      width: size.width - 120,
      align: "center",
    };
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  }

  function handleLogoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const layer: ImageOverlayImageLayer = {
        type: "image",
        id: layerId(),
        src,
        x: size.width - 180,
        y: 40,
        width: 120,
        height: 120,
        opacity: 1,
      };
      setLayers((prev) => [...prev, layer]);
      setSelectedId(layer.id);
    };
    reader.readAsDataURL(file);
  }

  function removeSelected() {
    if (!selectedId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedId));
    setSelectedId(null);
  }

  async function handleSave() {
    const stage = stageRef.current;
    if (!stage) return;

    setSaving(true);
    setError(null);

    try {
      const dataUrl = stage.toDataURL({ pixelRatio: 1 });
      const blob = await fetch(dataUrl).then((r) => r.blob());

      const formData = new FormData();
      formData.append("image", blob, "edited.png");
      formData.append("overlays", JSON.stringify(layers));

      const response = await fetch(`/api/db/posts/${postId}/image`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save image");

      onSave(data.post.image);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const selectedText = layers.find(
    (l): l is ImageOverlayTextLayer => l.type === "text" && l.id === selectedId,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Customize visual
            </h2>
            <p className="text-xs text-slate-500">
              Drag text and images · {size.width}×{size.height}px for {post.platform}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row">
          <div className="flex flex-1 items-start justify-center overflow-auto rounded-lg bg-slate-100 p-4 dark:bg-slate-950">
            <Stage
              ref={stageRef}
              width={size.width * displayScale}
              height={size.height * displayScale}
              scaleX={displayScale}
              scaleY={displayScale}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer>
                {baseImage && (
                  <KonvaImage
                    image={baseImage}
                    width={size.width}
                    height={size.height}
                  />
                )}
                {layers.map((layer) => {
                  if (layer.type === "text") {
                    return (
                      <Text
                        key={layer.id}
                        id={layer.id}
                        text={layer.text}
                        x={layer.x}
                        y={layer.y}
                        fontSize={layer.fontSize}
                        fill={layer.color}
                        fontFamily={layer.fontFamily}
                        fontStyle={layer.fontStyle ?? "normal"}
                        align={layer.align ?? "left"}
                        width={layer.width}
                        draggable
                        onClick={() => setSelectedId(layer.id)}
                        onTap={() => setSelectedId(layer.id)}
                        onDragEnd={(e) =>
                          updateLayer(layer.id, {
                            x: e.target.x(),
                            y: e.target.y(),
                          })
                        }
                        stroke={selectedId === layer.id ? "#f59e0b" : undefined}
                        strokeWidth={selectedId === layer.id ? 2 : 0}
                      />
                    );
                  }
                  return (
                    <OverlayImageNode
                      key={layer.id}
                      layer={layer}
                      selected={selectedId === layer.id}
                      onSelect={() => setSelectedId(layer.id)}
                      onChange={(patch) => updateLayer(layer.id, patch)}
                    />
                  );
                })}
              </Layer>
            </Stage>
          </div>

          <div className="w-full shrink-0 space-y-3 lg:w-56">
            <button
              type="button"
              onClick={addTextLayer}
              className="w-full rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              + Add text
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              + Add logo / image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
            {selectedText && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <label className="text-xs font-medium text-slate-500">Edit text</label>
                <textarea
                  rows={3}
                  value={selectedText.text}
                  onChange={(e) =>
                    updateLayer(selectedText.id, { text: e.target.value })
                  }
                  className="w-full rounded border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="color"
                  value={selectedText.color}
                  onChange={(e) =>
                    updateLayer(selectedText.id, { color: e.target.value })
                  }
                  className="h-8 w-full cursor-pointer"
                />
                <input
                  type="range"
                  min={16}
                  max={96}
                  value={selectedText.fontSize}
                  onChange={(e) =>
                    updateLayer(selectedText.id, {
                      fontSize: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            )}
            {selectedId && (
              <button
                type="button"
                onClick={removeSelected}
                className="w-full rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                Remove selected
              </button>
            )}
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !baseImage}
              className="w-full rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save visual"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverlayImageNode({
  layer,
  selected,
  onSelect,
  onChange,
}: {
  layer: ImageOverlayImageLayer;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<ImageOverlayImageLayer>) => void;
}) {
  const image = useHtmlImage(layer.src);
  if (!image) return null;

  return (
    <KonvaImage
      id={layer.id}
      image={image}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      opacity={layer.opacity}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) =>
        onChange({ x: e.target.x(), y: e.target.y() })
      }
      stroke={selected ? "#f59e0b" : undefined}
      strokeWidth={selected ? 2 : 0}
    />
  );
}