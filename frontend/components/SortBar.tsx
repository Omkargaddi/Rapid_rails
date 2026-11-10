"use client";

import { SORTS, type SortKey } from "@/lib/filters";

export function SortBar({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  return (
    <label className="relative inline-flex items-center gap-2 text-xs text-slate-500">
      Sort by
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-8 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-2.5 pr-7 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-2 h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
      </svg>
    </label>
  );
}
