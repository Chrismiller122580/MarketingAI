"use client";

import { useMemo, useState } from "react";
import {
  generateNames,
  handleFromName,
  regionFromLocation,
  regionLabel,
  type NameGender,
} from "@/lib/viraforge/avatar-name-generator";

type AvatarNameGeneratorProps = {
  location: string;
  gender: NameGender;
  selectedName?: string;
  onSelect: (name: string, handle: string) => void;
  onGenderChange?: (gender: NameGender) => void;
  className?: string;
};

const GENDER_TABS: { id: NameGender; label: string }[] = [
  { id: "female", label: "Women" },
  { id: "male", label: "Men" },
  { id: "nonbinary", label: "Neutral" },
];

export function AvatarNameGenerator({
  location,
  gender,
  selectedName,
  onSelect,
  onGenderChange,
  className = "",
}: AvatarNameGeneratorProps) {
  const [salt, setSalt] = useState(0);
  const [draft, setDraft] = useState("");
  const [localGender, setLocalGender] = useState<NameGender>(gender);

  const activeGender = onGenderChange ? gender : localGender;
  const region = regionFromLocation(location || "");
  const names = useMemo(
    () =>
      generateNames({
        location: location || "",
        gender: activeGender,
        count: 8,
        salt: salt + region.length * 13,
      }),
    [location, activeGender, salt, region],
  );

  const setGender = (g: NameGender) => {
    if (onGenderChange) onGenderChange(g);
    else setLocalGender(g);
    setSalt((s) => s + 1);
  };

  return (
    <div
      className={`rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Avatar name</p>
          <p className="text-xs text-muted-foreground">
            Tap a name to set the influencer. Matched to{" "}
            {location?.trim()
              ? location
              : `${regionLabel(region)} (set location for better fit)`}
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSalt((s) => s + 17)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-violet-400"
        >
          New batch
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {GENDER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setGender(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              activeGender === tab.id
                ? "bg-violet-600 text-white"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {names.map((n) => {
          const selected = selectedName === n.full;
          return (
            <button
              key={`${n.full}-${n.handle}`}
              type="button"
              onClick={() => onSelect(n.full, n.handle)}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-violet-500 bg-violet-500/15 ring-1 ring-violet-500/40"
                  : "border-border bg-card hover:border-violet-300"
              }`}
            >
              <span className="block text-sm font-medium text-foreground">
                {n.full}
              </span>
              <span className="text-[11px] text-muted-foreground">
                @{n.handle} · {regionLabel(n.region)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Or type a name"
          className="w-full flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={() => {
            const full = draft.trim();
            if (!full) return;
            onSelect(full, handleFromName(full));
            setDraft("");
          }}
          className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground disabled:opacity-40"
        >
          Use this name
        </button>
      </div>
    </div>
  );
}
