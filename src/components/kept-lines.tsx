"use client";

import { useEffect, useState } from "react";

type KeptLine = {
  id: string;
  kept: boolean;
  text: string;
  source: string;
  fromLife: boolean;
  name: string;
};

export function KeptLines() {
  const [lines, setLines] = useState<KeptLine[]>([]);

  useEffect(() => {
    void fetch("/api/avatars/kept")
      .then((res) => (res.ok ? res.json() : { lines: [] }))
      .then((data: { lines?: KeptLine[] }) => setLines(data.lines ?? []))
      .catch(() => setLines([]));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Lines they tried
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        A tried line was spoken. A kept line is one you copied or locked. From life means it opened on a day they lived.
      </p>
      {lines.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nothing yet. Make a TikTok or keep a photo.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {lines.map((line) => (
            <li key={line.id} className="text-sm">
              <p className="text-xs text-slate-500">
                {line.kept ? "Kept" : "Tried"}
                {line.fromLife ? " · from a lived day" : ""}
                {line.name ? ` · ${line.name}` : ""}
                {line.source ? ` · ${line.source}` : ""}
              </p>
              <p className="mt-0.5 text-slate-800 dark:text-slate-100">{line.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
