"use client";

import type { ContentAngle } from "@/lib/types";
import { CONTENT_ANGLE_OPTIONS } from "@/lib/content-angles";

type ContentAnglePickerProps = {
  value: ContentAngle;
  onChange: (angle: ContentAngle) => void;
  compact?: boolean;
};

export function ContentAnglePicker({
  value,
  onChange,
  compact = false,
}: ContentAnglePickerProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50 ${
        compact ? "space-y-2 p-3" : "space-y-3 p-4"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Creative angle
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Pick a hook style or let AI choose the freshest angle for your library.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CONTENT_ANGLE_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              title={option.hint}
              onClick={() => onChange(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-violet-600 text-white shadow-sm"
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