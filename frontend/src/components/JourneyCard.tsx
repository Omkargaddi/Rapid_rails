
import { Fragment, useState } from "react";
import { dayDiff, duration, hhmm, shortDate, stationLabel } from "@/lib/format";
import { legColor } from "@/lib/palette";
import type { Journey, Segment, Transfer } from "@/lib/types";

function DayBadge({ base, dt }: { base: string; dt: string }) {
  const d = dayDiff(base, dt);
  if (d <= 0) return null;
  return (
    <sup className="ml-0.5 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" title={shortDate(dt)}>
      +{d}
    </sup>
  );
}

function LegBar({ j }: { j: Journey }) {
  const parts: { kind: "leg" | "wait"; minutes: number; i: number; label: string }[] = [];
  j.segments.forEach((s, i) => {
    parts.push({ kind: "leg", minutes: s.duration_minutes, i, label: `${s.train_number} ${s.from_station.code}→${s.to_station.code} · ${duration(s.duration_minutes)}` });
    const t = j.transfers[i];
    if (t) parts.push({ kind: "wait", minutes: t.wait_minutes, i, label: `Wait at ${stationLabel(t.station)} · ${duration(t.wait_minutes)}` });
  });
  const total = parts.reduce((a, p) => a + p.minutes, 0) || 1;
  return (
    <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Trip timeline">
      {parts.map((p, k) => (
        <span
          key={k}
          title={p.label}
          className={p.kind === "wait" ? "wait-hatch rounded-full" : "rounded-full"}
          style={{ flexGrow: Math.max(p.minutes / total, 0.015), background: p.kind === "leg" ? legColor(p.i) : undefined }}
        />
      ))}
    </div>
  );
}

function Node({ time, base, station, color, end }: { time: string; base: string; station: { code: string | null; name: string }; color: string; end?: boolean }) {
  return (
    <li className="relative flex items-start gap-3">
      <div className="tabular w-14 shrink-0 pt-0.5 text-right text-sm font-semibold">
        {hhmm(time)}
        <DayBadge base={base} dt={time} />
      </div>
      <span className="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-[3px] bg-white dark:bg-slate-900" style={{ borderColor: color, background: end ? color : undefined }} />
      <div className="min-w-0 pb-1 text-sm">
        <span className="font-medium">{station.name}</span> {station.code && <span className="font-mono text-xs text-slate-500">{station.code}</span>}
      </div>
    </li>
  );
}

function SegmentBody({ seg, base, color, onExclude }: { seg: Segment; base: string; color: string; onExclude: () => void }) {
  const [open, setOpen] = useState(false);
  const intermediate = seg.stops.slice(1, -1);
  return (
    <li className="relative flex gap-3">
      <div className="w-14 shrink-0" />
      <div className="flex w-3 shrink-0 justify-center">
        <span className="w-1 rounded-full" style={{ background: color }} />
      </div>
      <div className="min-w-0 flex-1 py-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="chip font-mono text-white" style={{ background: color }}>
              {seg.train_number}
            </span>
            <span className="font-medium">{seg.train_name}</span>
            <span className="chip bg-slate-200/70 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">{seg.train_type}</span>
          </div>
          <div className="tabular mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{duration(seg.duration_minutes)}</span>
            <span>{Math.round(seg.distance_km)} km</span>
            <span>
              {seg.stop_count - 1} intermediate stop{seg.stop_count - 1 === 1 ? "" : "s"}
            </span>
            <span>train started {shortDate(seg.train_start_date)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
            {intermediate.length > 0 && (
              <button className="text-brand-600 hover:underline dark:text-brand-400" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                {open ? "Hide stops" : "Show stops"}
              </button>
            )}
            <button className="text-slate-500 hover:text-rose-600 hover:underline dark:text-slate-400" onClick={onExclude} title="Hide every journey that uses this train">
              Exclude train {seg.train_number}
            </button>
          </div>
          {open && (
            <ol className="scroll-thin mt-2 max-h-64 space-y-1 overflow-y-auto border-l border-dashed border-slate-300 pl-3 text-xs dark:border-slate-600">
              {intermediate.map((s, i) => (
                <li key={i} className="tabular flex gap-3">
                  <span className="w-24 shrink-0 text-slate-500">
                    {s.arrival_datetime ? hhmm(s.arrival_datetime) : "--:--"} – {s.departure_datetime ? hhmm(s.departure_datetime) : "--:--"}
                    {s.arrival_datetime && <DayBadge base={base} dt={s.arrival_datetime} />}
                  </span>
                  <span className={s.boardable ? "" : "italic text-slate-400"}>{stationLabel(s)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </li>
  );
}

function TransferRow({ t }: { t: Transfer }) {
  return (
    <li className="relative flex gap-3">
      <div className="w-14 shrink-0" />
      <div className="flex w-3 shrink-0 justify-center">
        <span className="w-0 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />
      </div>
      <div className="py-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="chip bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Transfer · {duration(t.wait_minutes)}</span> at{" "}
        {stationLabel(t.station)}
      </div>
    </li>
  );
}

interface Props {
  j: Journey;
  badges: string[];
  selected: boolean;
  onSelect: () => void;
  onHover: (on: boolean) => void;
  onExcludeTrain: (n: string) => void;
}

export function JourneyCard({ j, badges, selected, onSelect, onHover, onExcludeTrain }: Props) {
  const [open, setOpen] = useState(false);
  const base = j.departure_datetime;
  return (
    <article
      id={`journey-${j.id}`}
      className={`card scroll-mt-24 overflow-hidden transition ${selected ? "ring-2 ring-brand-500 dark:ring-brand-400" : "hover:shadow-lift"}`}
      aria-label={`Journey ${j.rank}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        className="cursor-pointer p-4 outline-none focus-visible:bg-brand-50/50 dark:focus-visible:bg-brand-900/20"
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="tabular mr-1 text-xs font-semibold text-slate-400">#{j.rank}</span>
          {j.is_direct ? (
            <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">Direct</span>
          ) : (
            <span className="chip bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {j.transfer_count} transfer{j.transfer_count === 1 ? "" : "s"}
            </span>
          )}
          {badges.map((b) => (
            <span key={b} className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {b}
            </span>
          ))}
          <span className="tabular ml-auto text-sm font-semibold text-slate-700 dark:text-slate-200">{duration(j.duration_minutes)}</span>
        </div>

        <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div>
            <div className="tabular text-2xl font-bold tracking-tight">{hhmm(j.departure_datetime)}</div>
            <div className="text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{j.source.code}</span> · {shortDate(j.departure_datetime)}
            </div>
          </div>
          <div className="min-w-0">
            <LegBar j={j} />
            <div className="mt-1.5 flex justify-center gap-1 truncate text-[11px] text-slate-400">
              {j.transfers.length > 0 ? <>via {j.transfers.map((t) => t.station.code).join(", ")}</> : <>no change of train</>}
            </div>
          </div>
          <div className="text-right">
            <div className="tabular text-2xl font-bold tracking-tight">
              {hhmm(j.arrival_datetime)}
              <DayBadge base={base} dt={j.arrival_datetime} />
            </div>
            <div className="text-xs text-slate-500">
              {shortDate(j.arrival_datetime)} · <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{j.destination.code}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {j.segments.map((s, i) => (
            <span key={i} className="chip bg-slate-100 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-200" title={s.train_name}>
              <span className="h-2 w-2 rounded-full" style={{ background: legColor(i) }} />
              {s.train_number}
            </span>
          ))}
          <span className="tabular ml-auto text-xs text-slate-500">
            {Math.round(j.distance_km)} km · wait {duration(j.waiting_minutes)}
          </span>
        </div>
      </div>

      <button
        className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/50 dark:hover:text-white"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "Hide itinerary" : "Show itinerary"}
        <svg viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="currentColor" aria-hidden>
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
          <dl className="tabular mb-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
            <div>
              <dt className="text-slate-400">On train</dt>
              <dd className="font-semibold">{duration(j.train_travel_minutes)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Waiting at transfers</dt>
              <dd className="font-semibold">{duration(j.waiting_minutes)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">From your start time</dt>
              <dd className="font-semibold">{duration(j.total_elapsed_duration_minutes)}</dd>
            </div>
          </dl>
          <ol className="relative">
            {j.segments.map((seg, i) => (
              <Fragment key={i}>
                <Node time={seg.departure_datetime} base={base} station={seg.from_station} color={legColor(i)} end={i === 0} />
                <SegmentBody seg={seg} base={base} color={legColor(i)} onExclude={() => onExcludeTrain(seg.train_number)} />
                <Node time={seg.arrival_datetime} base={base} station={seg.to_station} color={legColor(i)} end={i === j.segments.length - 1} />
                {j.transfers[i] && <TransferRow t={j.transfers[i]} />}
              </Fragment>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
