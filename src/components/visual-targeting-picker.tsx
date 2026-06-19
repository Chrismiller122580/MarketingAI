"use client";

import type { VisualTargeting } from "@/lib/visual-targeting";
import {
  VISUAL_DEMOGRAPHIC_OPTIONS,
  VISUAL_MOOD_OPTIONS,
  VISUAL_SCENE_OPTIONS,
  VISUAL_SETTING_OPTIONS,
} from "@/lib/visual-targeting";

type VisualTargetingPickerProps = {
  value: VisualTargeting;
  onChange: (next: VisualTargeting) => void;
  compact?: boolean;
};

type ChipGroupProps<T extends string> = {
  label: string;
  options: { value: T; label: string; hint?: string }[];
  selected: T;
  onSelect: (value: T) => void;
};

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: ChipGroupProps<T>) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              title={option.hint}
              onClick={() => onSelect(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VisualTargetingPicker({
  value,
  onChange,
  compact = false,
}: VisualTargetingPickerProps) {
  const patch = (partial: Partial<VisualTargeting>) =>
    onChange({ ...value, ...partial });

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50 ${
        compact ? "space-y-3 p-3" : "space-y-4 p-4"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Visual direction
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Auto-targeted from your business model and platform — override any chip to customize.
        </p>
      </div>

      <div className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
        <ChipGroup
          label="Subject & scene"
          options={VISUAL_SCENE_OPTIONS}
          selected={value.scene}
          onSelect={(scene) => patch({ scene })}
        />
        <ChipGroup
          label="Audience"
          options={VISUAL_DEMOGRAPHIC_OPTIONS}
          selected={value.demographic}
          onSelect={(demographic) => patch({ demographic })}
        />
        <ChipGroup
          label="Mood & style"
          options={VISUAL_MOOD_OPTIONS}
          selected={value.mood}
          onSelect={(mood) => patch({ mood })}
        />
        <ChipGroup
          label="Setting"
          options={VISUAL_SETTING_OPTIONS}
          selected={value.setting}
          onSelect={(setting) => patch({ setting })}
        />
      </div>
    </div>
  );
}