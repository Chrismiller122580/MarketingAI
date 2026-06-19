"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text,
  Rect,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import { getPlatformSize } from "@/lib/platform-sizes";
import {
  defaultEditorLayers,
  FONT_OPTIONS,
  presetBottomBar,
  presetBrandTag,
  presetCtaPill,
  presetHeadline,
  presetSubtitle,
} from "@/lib/visual-editor-presets";
import type {
  GeneratedPost,
  ImageOverlayImageLayer,
  ImageOverlayLayer,
  ImageOverlayShapeLayer,
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

function layerLabel(layer: ImageOverlayLayer): string {
  if (layer.type === "text") {
    const preview = layer.text.replace(/\s+/g, " ").trim().slice(0, 28);
    return preview || "Text";
  }
  if (layer.type === "shape") {
    return layer.shape === "pill" ? "Pill shape" : "Bar / block";
  }
  return "Image";
}

function isTextLayer(layer: ImageOverlayLayer): layer is ImageOverlayTextLayer {
  return layer.type === "text";
}

function isImageLayer(layer: ImageOverlayLayer): layer is ImageOverlayImageLayer {
  return layer.type === "image";
}

function isShapeLayer(layer: ImageOverlayLayer): layer is ImageOverlayShapeLayer {
  return layer.type === "shape";
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
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layersRef = useRef<ImageOverlayLayer[]>([]);
  const dragSnapshotRef = useRef<ImageOverlayLayer[] | null>(null);

  const size = getPlatformSize(post.platform);
  const displayScale = Math.min(640 / size.width, 520 / size.height, 1);

  const baseUrl =
    post.image.originalBaseUrl ?? post.image.originalUrl ?? post.image.url;
  const baseImage = useHtmlImage(baseUrl);

  const initialLayers =
    post.image.overlays?.length
      ? post.image.overlays
      : defaultEditorLayers(
          post,
          brandName,
          themeColor,
          size.width,
          size.height,
        );

  const [layers, setLayers] = useState<ImageOverlayLayer[]>(initialLayers);
  const [undoStack, setUndoStack] = useState<ImageOverlayLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<ImageOverlayLayer[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  layersRef.current = layers;

  const commitLayers = useCallback((next: ImageOverlayLayer[]) => {
    setUndoStack((stack) => [...stack, layersRef.current]);
    setRedoStack([]);
    setLayers(next);
  }, []);

  const patchLayers = useCallback(
    (updater: (prev: ImageOverlayLayer[]) => ImageOverlayLayer[]) => {
      setLayers((prev) => updater(prev));
    },
    [],
  );

  const updateLayer = useCallback(
    (
      id: string,
      patch: Partial<ImageOverlayLayer>,
      options?: { commit?: boolean },
    ) => {
      const apply = (prev: ImageOverlayLayer[]) =>
        prev.map((layer) =>
          layer.id === id ? ({ ...layer, ...patch } as ImageOverlayLayer) : layer,
        );

      if (options?.commit) {
        commitLayers(apply(layersRef.current));
      } else {
        patchLayers(apply);
      }
    },
    [commitLayers, patchLayers],
  );

  const addLayers = useCallback(
    (newLayers: ImageOverlayLayer[], selectId?: string) => {
      commitLayers([...layersRef.current, ...newLayers]);
      setSelectedId(selectId ?? newLayers[0]?.id ?? null);
    },
    [commitLayers],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const previous = stack[stack.length - 1];
      setRedoStack((redo) => [layersRef.current, ...redo]);
      setLayers(previous);
      return stack.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (!stack.length) return stack;
      const next = stack[0];
      setUndoStack((undo) => [...undo, layersRef.current]);
      setLayers(next);
      return stack.slice(1);
    });
  }, []);

  const moveLayer = useCallback(
    (id: string, direction: "up" | "down") => {
      const current = [...layersRef.current];
      const index = current.findIndex((l) => l.id === id);
      if (index < 0) return;
      const target = direction === "up" ? index + 1 : index - 1;
      if (target < 0 || target >= current.length) return;
      [current[index], current[target]] = [current[target], current[index]];
      commitLayers(current);
    },
    [commitLayers],
  );

  const removeLayer = useCallback(
    (id: string) => {
      commitLayers(layersRef.current.filter((l) => l.id !== id));
      setSelectedId((selected) => (selected === id ? null : selected));
    },
    [commitLayers],
  );

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    if (!selectedId) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    const node = stage.findOne(`#${selectedId}`);
    if (node) {
      transformer.nodes([node]);
      transformer.getLayer()?.batchDraw();
    } else {
      transformer.nodes([]);
    }
  }, [selectedId, layers]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.target instanceof HTMLTextAreaElement) return;
      if (event.target instanceof HTMLSelectElement) return;

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (mod && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        removeLayer(selectedId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, removeLayer, selectedId]);

  function beginDragSnapshot() {
    dragSnapshotRef.current = layersRef.current.map((layer) => ({ ...layer }));
  }

  function endDragSnapshot(id: string, patch: Partial<ImageOverlayLayer>) {
    const snapshot = dragSnapshotRef.current;
    dragSnapshotRef.current = null;
    if (!snapshot) {
      updateLayer(id, patch);
      return;
    }
    const next = snapshot.map((layer) =>
      layer.id === id ? ({ ...layer, ...patch } as ImageOverlayLayer) : layer,
    );
    setUndoStack((stack) => [...stack, snapshot]);
    setRedoStack([]);
    setLayers(next);
  }

  function addBlankText() {
    const layer: ImageOverlayTextLayer = {
      type: "text",
      id: layerId(),
      text: "Your text",
      x: 60,
      y: size.height / 2,
      fontSize: 32,
      color: "#ffffff",
      fontFamily: FONT_OPTIONS[0].value,
      width: size.width - 120,
      align: "center",
      shadowColor: "#000000",
      shadowBlur: 4,
      shadowOpacity: 0.45,
    };
    addLayers([layer], layer.id);
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
      addLayers([layer], layer.id);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const stage = stageRef.current;
    if (!stage) return;

    setSelectedId(null);
    setSaving(true);
    setError(null);

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const dataUrl = stage.toDataURL({ pixelRatio: 1 });
      const blob = await fetch(dataUrl).then((r) => r.blob());

      const formData = new FormData();
      formData.append("image", blob, "edited.png");
      formData.append("overlays", JSON.stringify(layersRef.current));

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

  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;
  const selectedText = selectedLayer && isTextLayer(selectedLayer) ? selectedLayer : null;
  const selectedImage = selectedLayer && isImageLayer(selectedLayer) ? selectedLayer : null;
  const selectedShape = selectedLayer && isShapeLayer(selectedLayer) ? selectedLayer : null;

  const toolbarBtn =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Customize visual
            </h2>
            <p className="text-xs text-slate-500">
              {size.width}×{size.height}px · {post.platform} · drag, resize, rotate layers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={!undoStack.length}
              className="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!redoStack.length}
              className="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={toolbarBtn}
              onClick={() =>
                addLayers([
                  presetHeadline(post, brandName, size.width, size.height),
                ])
              }
            >
              Headline
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() =>
                addLayers([presetSubtitle(post, size.width, size.height)])
              }
            >
              Subtitle
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => addLayers([presetBottomBar(size.width, size.height)])}
            >
              Dark bar
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() =>
                addLayers(
                  presetCtaPill(post, themeColor, size.width, size.height),
                )
              }
            >
              CTA pill
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() =>
                addLayers(
                  presetBrandTag(brandName, themeColor, size.width),
                )
              }
            >
              Brand tag
            </button>
            <button type="button" className={toolbarBtn} onClick={addBlankText}>
              + Text
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              + Logo
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
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
          <div className="flex min-h-[280px] flex-1 items-start justify-center overflow-auto rounded-lg bg-slate-100 p-3 dark:bg-slate-950">
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
                  if (isTextLayer(layer)) {
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
                        rotation={layer.rotation ?? 0}
                        opacity={layer.opacity ?? 1}
                        shadowColor={layer.shadowColor}
                        shadowBlur={layer.shadowBlur ?? 0}
                        shadowOpacity={layer.shadowOpacity ?? 0}
                        draggable
                        onClick={() => setSelectedId(layer.id)}
                        onTap={() => setSelectedId(layer.id)}
                        onDragStart={beginDragSnapshot}
                        onDragEnd={(e) =>
                          endDragSnapshot(layer.id, {
                            x: e.target.x(),
                            y: e.target.y(),
                          })
                        }
                        onTransformStart={beginDragSnapshot}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          const scaleX = node.scaleX();
                          const scaleY = node.scaleY();
                          node.scaleX(1);
                          node.scaleY(1);
                          endDragSnapshot(layer.id, {
                            x: node.x(),
                            y: node.y(),
                            rotation: node.rotation(),
                            fontSize: Math.max(
                              12,
                              Math.round(layer.fontSize * scaleY),
                            ),
                            width: layer.width
                              ? Math.round(layer.width * scaleX)
                              : undefined,
                          });
                        }}
                      />
                    );
                  }

                  if (isShapeLayer(layer)) {
                    return (
                      <Rect
                        key={layer.id}
                        id={layer.id}
                        x={layer.x}
                        y={layer.y}
                        width={layer.width}
                        height={layer.height}
                        fill={layer.fill}
                        opacity={layer.opacity}
                        cornerRadius={
                          layer.cornerRadius ??
                          (layer.shape === "pill" ? layer.height / 2 : 0)
                        }
                        rotation={layer.rotation ?? 0}
                        draggable
                        onClick={() => setSelectedId(layer.id)}
                        onTap={() => setSelectedId(layer.id)}
                        onDragStart={beginDragSnapshot}
                        onDragEnd={(e) =>
                          endDragSnapshot(layer.id, {
                            x: e.target.x(),
                            y: e.target.y(),
                          })
                        }
                        onTransformStart={beginDragSnapshot}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          const scaleX = node.scaleX();
                          const scaleY = node.scaleY();
                          node.scaleX(1);
                          node.scaleY(1);
                          const width = Math.max(8, node.width() * scaleX);
                          const height = Math.max(8, node.height() * scaleY);
                          endDragSnapshot(layer.id, {
                            x: node.x(),
                            y: node.y(),
                            width,
                            height,
                            rotation: node.rotation(),
                            cornerRadius:
                              layer.shape === "pill" ? height / 2 : layer.cornerRadius,
                          });
                        }}
                      />
                    );
                  }

                  return (
                    <OverlayImageNode
                      key={layer.id}
                      layer={layer}
                      onSelect={() => setSelectedId(layer.id)}
                      onDragStart={beginDragSnapshot}
                      onChange={(patch, commit) =>
                        commit
                          ? endDragSnapshot(layer.id, patch)
                          : updateLayer(layer.id, patch)
                      }
                    />
                  );
                })}
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  enabledAnchors={[
                    "top-left",
                    "top-right",
                    "bottom-left",
                    "bottom-right",
                    "middle-left",
                    "middle-right",
                  ]}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 16 || newBox.height < 16) return oldBox;
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 overflow-auto lg:w-72">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                Layers
              </div>
              <ul className="max-h-40 overflow-auto p-2">
                {layers.length === 0 && (
                  <li className="px-2 py-3 text-center text-xs text-slate-400">
                    No layers yet — add a preset above
                  </li>
                )}
                {[...layers].reverse().map((layer, reversedIndex) => {
                  const index = layers.length - 1 - reversedIndex;
                  const active = layer.id === selectedId;
                  return (
                    <li
                      key={layer.id}
                      className={`mb-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs ${
                        active
                          ? "bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => setSelectedId(layer.id)}
                      >
                        {layerLabel(layer)}
                      </button>
                      <button
                        type="button"
                        title="Move up"
                        disabled={index >= layers.length - 1}
                        onClick={() => moveLayer(layer.id, "up")}
                        className="rounded px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={index <= 0}
                        onClick={() => moveLayer(layer.id, "down")}
                        className="rounded px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => removeLayer(layer.id)}
                        className="rounded px-1 text-rose-500 hover:text-rose-700"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {selectedText && (
              <div className="space-y-2.5 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500">Text</p>
                <textarea
                  rows={3}
                  value={selectedText.text}
                  onFocus={beginDragSnapshot}
                  onChange={(e) =>
                    updateLayer(selectedText.id, { text: e.target.value })
                  }
                  onBlur={() => {
                    const snapshot = dragSnapshotRef.current;
                    dragSnapshotRef.current = null;
                    if (!snapshot) return;
                    const before = snapshot.find((l) => l.id === selectedText.id);
                    const after = layersRef.current.find((l) => l.id === selectedText.id);
                    if (
                      before &&
                      after &&
                      isTextLayer(before) &&
                      isTextLayer(after) &&
                      before.text === after.text
                    ) {
                      return;
                    }
                    setUndoStack((stack) => [...stack, snapshot]);
                    setRedoStack([]);
                  }}
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-slate-500">
                    Color
                    <input
                      type="color"
                      value={selectedText.color}
                      onChange={(e) =>
                        updateLayer(
                          selectedText.id,
                          { color: e.target.value },
                          { commit: true },
                        )
                      }
                      className="mt-1 h-8 w-full cursor-pointer rounded border border-slate-200 dark:border-slate-700"
                    />
                  </label>
                  <label className="text-[11px] text-slate-500">
                    Font
                    <select
                      value={selectedText.fontFamily}
                      onChange={(e) =>
                        updateLayer(
                          selectedText.id,
                          { fontFamily: e.target.value },
                          { commit: true },
                        )
                      }
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.id} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block text-[11px] text-slate-500">
                  Size ({selectedText.fontSize}px)
                  <input
                    type="range"
                    min={12}
                    max={120}
                    value={selectedText.fontSize}
                    onChange={(e) =>
                      updateLayer(selectedText.id, {
                        fontSize: Number(e.target.value),
                      })
                    }
                    onMouseUp={() =>
                      updateLayer(
                        selectedText.id,
                        { fontSize: selectedText.fontSize },
                        { commit: true },
                      )
                    }
                    onTouchEnd={() =>
                      updateLayer(
                        selectedText.id,
                        { fontSize: selectedText.fontSize },
                        { commit: true },
                      )
                    }
                    className="mt-1 w-full"
                  />
                </label>
                <div className="flex gap-1">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() =>
                        updateLayer(selectedText.id, { align }, { commit: true })
                      }
                      className={`flex-1 rounded border px-2 py-1 text-[11px] capitalize ${
                        (selectedText.align ?? "left") === align
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-600 dark:border-slate-700"
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateLayer(
                        selectedText.id,
                        {
                          fontStyle:
                            selectedText.fontStyle === "bold" ? "normal" : "bold",
                        },
                        { commit: true },
                      )
                    }
                    className={`rounded border px-2 py-1 text-[11px] font-bold ${
                      selectedText.fontStyle === "bold"
                        ? "border-violet-300 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-600 dark:border-slate-700"
                    }`}
                  >
                    B
                  </button>
                </div>
                <label className="block text-[11px] text-slate-500">
                  Opacity
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={selectedText.opacity ?? 1}
                    onChange={(e) =>
                      updateLayer(selectedText.id, {
                        opacity: Number(e.target.value),
                      })
                    }
                    onMouseUp={() =>
                      updateLayer(
                        selectedText.id,
                        { opacity: selectedText.opacity ?? 1 },
                        { commit: true },
                      )
                    }
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block text-[11px] text-slate-500">
                  Shadow blur
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={selectedText.shadowBlur ?? 0}
                    onChange={(e) =>
                      updateLayer(selectedText.id, {
                        shadowBlur: Number(e.target.value),
                      })
                    }
                    onMouseUp={() =>
                      updateLayer(
                        selectedText.id,
                        { shadowBlur: selectedText.shadowBlur ?? 0 },
                        { commit: true },
                      )
                    }
                    className="mt-1 w-full"
                  />
                </label>
              </div>
            )}

            {selectedImage && (
              <div className="space-y-2.5 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500">Image</p>
                <label className="block text-[11px] text-slate-500">
                  Opacity
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={selectedImage.opacity}
                    onChange={(e) =>
                      updateLayer(selectedImage.id, {
                        opacity: Number(e.target.value),
                      })
                    }
                    onMouseUp={() =>
                      updateLayer(
                        selectedImage.id,
                        { opacity: selectedImage.opacity },
                        { commit: true },
                      )
                    }
                    className="mt-1 w-full"
                  />
                </label>
              </div>
            )}

            {selectedShape && (
              <div className="space-y-2.5 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500">Shape</p>
                <label className="text-[11px] text-slate-500">
                  Fill
                  <input
                    type="color"
                    value={selectedShape.fill}
                    onChange={(e) =>
                      updateLayer(
                        selectedShape.id,
                        { fill: e.target.value },
                        { commit: true },
                      )
                    }
                    className="mt-1 h-8 w-full cursor-pointer rounded border border-slate-200 dark:border-slate-700"
                  />
                </label>
                <label className="block text-[11px] text-slate-500">
                  Opacity
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={selectedShape.opacity}
                    onChange={(e) =>
                      updateLayer(selectedShape.id, {
                        opacity: Number(e.target.value),
                      })
                    }
                    onMouseUp={() =>
                      updateLayer(
                        selectedShape.id,
                        { opacity: selectedShape.opacity },
                        { commit: true },
                      )
                    }
                    className="mt-1 w-full"
                  />
                </label>
              </div>
            )}

            {!selectedLayer && (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700">
                Select a layer on the canvas or in the list to edit its properties.
              </p>
            )}

            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !baseImage}
              className="w-full rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
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
  onSelect,
  onDragStart,
  onChange,
}: {
  layer: ImageOverlayImageLayer;
  onSelect: () => void;
  onDragStart: () => void;
  onChange: (patch: Partial<ImageOverlayImageLayer>, commit?: boolean) => void;
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
      rotation={layer.rotation ?? 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onDragStart}
      onDragEnd={(e) =>
        onChange({ x: e.target.x(), y: e.target.y() }, true)
      }
      onTransformStart={onDragStart}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange(
          {
            x: node.x(),
            y: node.y(),
            width: Math.max(16, node.width() * scaleX),
            height: Math.max(16, node.height() * scaleY),
            rotation: node.rotation(),
          },
          true,
        );
      }}
    />
  );
}