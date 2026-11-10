import { lazy, Suspense, useState } from "react";
import { duration } from "@/lib/format";
import { legColor } from "@/lib/palette";
import type { Journey, StationHit } from "@/lib/types";

const RouteMap = lazy(() => import("./RouteMap"));

interface Props {
  journeys: Journey[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string) => void;
  endpoints: { from: StationHit | null; to: StationHit | null };
  className?: string;
}

export function MapPanel({ journeys, selectedId, hoverId, onSelect, endpoints, className = "" }: Props) {
  const [fitAllSignal, setFitAllSignal] = useState(0);
  const selected = journeys.find((j) => j.id === selectedId) ?? null;
  return (
    <div className={`card relative isolate overflow-hidden ${className}`}>
      <Suspense fallback={<div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-900" />}>
        <RouteMap journeys={journeys} selectedId={selectedId} hoverId={hoverId} onSelect={onSelect} endpoints={endpoints} fitAllSignal={fitAllSignal} />
      </Suspense>

      {journeys.length > 1 && (
        <button
          type="button"
          onClick={() => setFitAllSignal((n) => n + 1)}
          className="absolute right-3 top-3 z-[500] rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-soft ring-1 ring-slate-200 backdrop-blur transition hover:text-brand-600 dark:bg-slate-900/90 dark:text-slate-200 dark:ring-slate-700"
        >
          Show all {journeys.length}
        </button>
      )}

      {selected && (
        <div className="pointer-events-none absolute left-3 right-32 top-3 z-[500] flex justify-start">
          <div className="pointer-events-auto max-w-full rounded-xl bg-white/95 p-2.5 text-xs shadow-soft ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/90 dark:ring-slate-700">
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <span className="font-semibold">Journey #{selected.rank}</span>
              <span className="tabular text-slate-500">{duration(selected.duration_minutes)}</span>
            </div>
            <ol className="space-y-1">
              {selected.segments.map((s, i) => (
                <li key={i} className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-5 shrink-0 rounded-full" style={{ background: legColor(i) }} />
                  <span className="font-mono font-semibold">{s.train_number}</span>
                  <span className="truncate text-slate-500 dark:text-slate-400">
                    {s.from_station.code} → {s.to_station.code}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {!selected && journeys.length === 0 && !endpoints.from && !endpoints.to && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-[500] flex justify-center px-4">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-soft ring-1 ring-slate-200 dark:bg-slate-900/90 dark:text-slate-300 dark:ring-slate-700">
            Pick two stations to see them on the map
          </span>
        </div>
      )}
    </div>
  );
}
