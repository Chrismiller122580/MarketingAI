"use client";

import type { AiProvider, AiVariant } from "@/lib/types";

type AiVariantPickerProps = {
  variants: AiVariant[];
  selected: AiProvider;
  recommendation?: AiProvider;
  onSelect: (provider: AiProvider, text: string) => void;
};

const providerColors: Record<AiProvider, string> = {
  openai: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
  xai: "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40",
};

const providerActiveRing: Record<AiProvider, string> = {
  openai: "ring-2 ring-emerald-500",
  xai: "ring-2 ring-violet-500",
};

export function AiVariantPicker({
  variants,
  selected,
  recommendation,
  onSelect,
}: AiVariantPickerProps) {
  if (variants.length < 2) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Dual AI comparison
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            GPT and Grok both wrote copy — pick your favorite
          </p>
        </div>
        {recommendation && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            Recommended: {variants.find((v) => v.provider === recommendation)?.label}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map((variant) => {
          const isSelected = selected === variant.provider;
          const isRecommended = recommendation === variant.provider;

          return (
            <button
              key={variant.provider}
              type="button"
              onClick={() => onSelect(variant.provider, variant.text)}
              className={`rounded-lg border p-3 text-left transition ${providerColors[variant.provider]} ${
                isSelected ? providerActiveRing[variant.provider] : "hover:opacity-90"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  {variant.label}
                </span>
                {isRecommended && (
                  <span className="text-[10px] font-medium text-amber-600">★ Best fit</span>
                )}
                {isSelected && (
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                    Selected
                  </span>
                )}
              </div>
              <p className="line-clamp-6 whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {variant.text}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}