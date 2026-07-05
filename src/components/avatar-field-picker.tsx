"use client";

import { useState } from "react";
import type { FieldOption } from "@/lib/viraforge/avatar-option-presets";

const CONFIDENCE_DOT: Record<FieldOption["confidence"], string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-400",
  low: "bg-slate-300 dark:bg-slate-600",
};

const SOURCE_LABEL: Record<FieldOption["source"], string> = {
  site: "From site",
  industry: "Industry",
  ai: "AI",
};

type AvatarFieldPickerProps = {
  label: string;
  fieldId: string;
  options: FieldOption[];
  selectedId?: string;
  onSelect: (option: FieldOption) => void;
  onCustom?: (value: string) => void;
  customValue?: string;
  allowCustom?: boolean;
  className?: string;
};

export function AvatarFieldPicker({
  label,
  fieldId,
  options,
  selectedId,
  onSelect,
  onCustom,
  customValue,
  allowCustom = true,
  className = "",
}: AvatarFieldPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [draft, setDraft] = useState(customValue ?? "");

  const selectedOption = options.find((o) => o.id === selectedId);
  const isCustomSelected =
    allowCustom &&
    customValue &&
    !options.some((o) => o.value === customValue);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {label}
        </label>
        {selectedOption && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {SOURCE_LABEL[selectedOption.source]}
          </span>
        )}
      </div>

      <div
        id={fieldId}
        role="radiogroup"
        aria-label={label}
        className="mt-2 flex flex-wrap gap-2"
      >
        {options.map((opt) => {
          const selected = selectedId === opt.id && !isCustomSelected;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setShowCustom(false);
                onSelect(opt);
              }}
              className={`group relative max-w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                selected
                  ? "border-violet-500 bg-violet-500/10 text-foreground ring-1 ring-violet-500/40"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-violet-300 hover:bg-muted hover:text-foreground"
              }`}
            >
              <span
                className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${CONFIDENCE_DOT[opt.confidence]}`}
                title={`${opt.confidence} confidence`}
              />
              <span className="block pr-4 font-medium leading-snug">{opt.label}</span>
            </button>
          );
        })}

        {allowCustom && (
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              showCustom || isCustomSelected
                ? "border-violet-500 bg-violet-500/10 text-foreground"
                : "border-dashed border-border text-muted-foreground hover:border-violet-300"
            }`}
          >
            Custom…
          </button>
        )}
      </div>

      {allowCustom && (showCustom || isCustomSelected) && onCustom && (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const trimmed = draft.trim();
            if (trimmed) onCustom(trimmed);
          }}
          placeholder="Type your own…"
          className="mt-2 w-full rounded-lg border border-border bg-muted p-2.5 text-sm text-foreground"
        />
      )}
    </div>
  );
}