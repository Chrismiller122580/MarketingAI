"use client";

import { useSettings, togglePlatform } from "@/context/settings-context";
import type { Platform } from "@/lib/types";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "pinterest", label: "Pinterest" },
];

export function SettingsForm() {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Brand voice</h2>
        <p className="mt-1 text-sm text-slate-500">
          Guides how AI writes all generated content
        </p>
        <textarea
          rows={4}
          value={settings.brandVoice}
          onChange={(e) => updateSettings({ brandVoice: e.target.value })}
          className="mt-4 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Target audience
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Who your content is written for
        </p>
        <input
          type="text"
          value={settings.targetAudience}
          onChange={(e) => updateSettings({ targetAudience: e.target.value })}
          className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Default platforms
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Used for campaign pack generation
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = settings.defaultPlatforms.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() =>
                  updateSettings({
                    defaultPlatforms: togglePlatform(
                      settings.defaultPlatforms,
                      p.value,
                    ),
                  })
                }
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Content style
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Emoji style
            </label>
            <select
              value={settings.emojiStyle}
              onChange={(e) =>
                updateSettings({
                  emojiStyle: e.target.value as "none" | "light" | "heavy",
                })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="none">No emojis</option>
              <option value="light">Light (1-2)</option>
              <option value="heavy">Heavy (expressive)</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.includeHashtags}
              onChange={(e) =>
                updateSettings({ includeHashtags: e.target.checked })
              }
              className="rounded border-slate-300 text-indigo-600"
            />
            <span className="text-sm text-slate-700">
              Include hashtags in social posts
            </span>
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={resetSettings}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        Reset to defaults
      </button>
    </div>
  );
}