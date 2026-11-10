"use client";

import { duration, hhmm } from "@/lib/format";
import type { Journey } from "@/lib/types";

export interface Highlight {
  id: string;
  label: string;
  pick: (js: Journey[]) => Journey | undefined;
  value: (j: Journey) => string;
}

const minBy = (js: Journey[], key: (j: Journey) => number) => js.reduce<Journey | undefined>((b, j) => (!b || key(j) < key(b) || (key(j) === key(b) && j.rank < b.rank) ? j : b), undefined);

export const HIGHLIGHTS: Highlight[] = [
  { id: "arrival", label: "Earliest arrival", pick: (js) => minBy(js, (j) => j.rank), value: (j) => hhmm(j.arrival_datetime) },
  { id: "duration", label: "Shortest trip", pick: (js) => minBy(js, (j) => j.duration_minutes), value: (j) => duration(j.duration_minutes) },
  { id: "transfers", label: "Fewest changes", pick: (js) => minBy(js, (j) => j.transfer_count), value: (j) => (j.transfer_count ? `${j.transfer_count} change${j.transfer_count > 1 ? "s" : ""}` : "Direct") },
  { id: "waiting", label: "Least waiting", pick: (js) => minBy(js, (j) => j.waiting_minutes), value: (j) => duration(j.waiting_minutes) },
];

/** Badge labels per journey id, for the cards. */
export function highlightBadges(js: Journey[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const h of HIGHLIGHTS) {
    const j = h.pick(js);
    if (j) m.set(j.id, [...(m.get(j.id) ?? []), h.label]);
  }
  return m;
}

export function SummaryStrip({ journeys, selectedId, onPick }: { journeys: Journey[]; selectedId: string | null; onPick: (id: string) => void }) {
  if (journeys.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {HIGHLIGHTS.map((h) => {
        const j = h.pick(journeys)!;
        const on = j.id === selectedId;
        return (
          <button
            key={h.id}
            onClick={() => onPick(j.id)}
            className={`card min-w-0 px-3 py-2.5 text-left transition hover:shadow-lift ${on ? "border-brand-500! ring-1 ring-brand-500 dark:border-brand-400!" : ""}`}
          >
            <div className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{h.label}</div>
            <div className="tabular truncate text-base font-bold">{h.value(j)}</div>
            <div className="tabular truncate text-[11px] text-slate-400">
              #{j.rank} · {hhmm(j.departure_datetime)}→{hhmm(j.arrival_datetime)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
