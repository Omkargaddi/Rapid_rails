"use client";

import { useState } from "react";
import { todayIso } from "@/lib/format";
import type { StationHit } from "@/lib/types";
import { StationPicker } from "./StationPicker";

export interface SearchInput {
  from: StationHit | null;
  to: StationHit | null;
  date: string;
  time: string;
}

interface Props {
  initial: SearchInput;
  loading: boolean;
  onSearch: (v: { from: StationHit; to: StationHit; date: string; time: string }) => void;
  /** Reports the picked stations as they change, so the map can pin them before a search. */
  onStationsChange?: (from: StationHit | null, to: StationHit | null) => void;
}

function plusDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SearchForm({ initial, loading, onSearch, onStationsChange }: Props) {
  const [v, setV] = useState<SearchInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [spin, setSpin] = useState(false);

  const update = (next: SearchInput) => {
    setV(next);
    if (next.from !== v.from || next.to !== v.to) onStationsChange?.(next.from, next.to);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.from || !v.to) return setError("Choose both stations from the suggestions.");
    if (v.from.code === v.to.code) return setError("Source and destination must be different stations.");
    if (!v.date || !v.time) return setError("Choose a date and time.");
    setError(null);
    onSearch({ from: v.from, to: v.to, date: v.date, time: v.time });
  };

  const today = todayIso();
  const quick = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: plusDays(today, 1) },
  ];

  return (
    <form onSubmit={submit} className="card p-4 shadow-lift sm:p-5" aria-label="Journey search">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <StationPicker label="From" value={v.from} onChange={(from) => update({ ...v, from })} autoFocus={!v.from} />
        <button
          type="button"
          onClick={() => {
            setSpin((s) => !s);
            update({ ...v, from: v.to, to: v.from });
          }}
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-500 hover:text-brand-600 md:mb-1 dark:border-slate-700 dark:bg-slate-900"
          aria-label="Swap source and destination"
          title="Swap"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 transition-transform duration-300 ${spin ? "rotate-[270deg] md:rotate-180" : "rotate-90 md:rotate-0"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 7h13l-4-4M17 17H4l4 4" />
          </svg>
        </button>
        <StationPicker label="To" value={v.to} onChange={(to) => update({ ...v, to })} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="date" className="field-label">
              Date
            </label>
            <div className="mb-1.5 flex gap-1">
              {quick.map((q) => (
                <button key={q.label} type="button" className="toggle px-2! py-0.5! text-[11px]!" aria-pressed={v.date === q.date} onClick={() => update({ ...v, date: q.date })}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
          <input id="date" type="date" className="input" value={v.date} onChange={(e) => update({ ...v, date: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="time" className="field-label">
            Earliest departure
          </label>
          <input id="time" type="time" className="input" value={v.time} onChange={(e) => update({ ...v, time: e.target.value })} required />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-br from-brand-500 to-brand-700 px-8 font-semibold text-white shadow-md shadow-brand-600/25 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-wait disabled:opacity-70 dark:focus:ring-brand-700/40"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M9 3.5a5.5 5.5 0 1 0 3.4 9.8l3.4 3.4a1 1 0 0 0 1.4-1.4l-3.4-3.4A5.5 5.5 0 0 0 9 3.5ZM5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
            </svg>
          )}
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </form>
  );
}
