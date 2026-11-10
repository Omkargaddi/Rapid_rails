"use client";
import { activeFilterCount, FILTER_DEFAULTS, type FilterState } from "@/lib/filters";

interface Props {
  value: FilterState;
  onChange: (f: FilterState) => void;
}

const TRANSFER_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "≤1", value: 1 },
  { label: "≤2", value: 2 },
  { label: "≤3", value: 3 },
];

const MIN_CONNECTION: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "45 min", value: 45 },
  { label: "1 h", value: 60 },
  { label: "1½ h", value: 90 },
  { label: "2 h", value: 120 },
];

const MAX_LAYOVER: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "2 h", value: 120 },
  { label: "4 h", value: 240 },
  { label: "8 h", value: 480 },
  { label: "12 h", value: 720 },
];

function Group({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} title={hint} className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniSelect({ id, items, value, onPick }: { id: string; items: { label: string; value: number | null }[]; value: number | null; onPick: (v: number | null) => void }) {
  return (
    <span className="relative inline-flex items-center">
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onPick(e.target.value === "null" ? null : Number(e.target.value))}
        className={`h-8 cursor-pointer appearance-none rounded-lg border bg-white pl-2.5 pr-7 text-xs font-medium outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-slate-900 ${
          value === null
            ? "border-slate-200 text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:text-slate-100"
            : "border-brand-500 text-brand-700 dark:border-brand-400 dark:text-brand-300"
        }`}
      >
        {items.map((o) => (
          <option key={o.label} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" fill="currentColor" aria-hidden>
        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
      </svg>
    </span>
  );
}

export function FilterBar({ value, onChange }: Props) {
  const n = activeFilterCount(value);
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="card flex flex-wrap items-center gap-x-3.5 gap-y-2 px-3 py-2" role="group" aria-label="Filters">
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" className="peer sr-only" checked={value.directOnly} onChange={(e) => set({ directOnly: e.target.checked })} />
        <span className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4 dark:bg-slate-700" />
        <span className="text-xs font-medium whitespace-nowrap">Direct only</span>
      </label>

      <Group label="Changes" hint="Maximum changes of train">
        <fieldset disabled={value.directOnly} className="disabled:opacity-50">
          <legend className="sr-only">Maximum changes of train</legend>
          <div className="segmented grid-cols-4 p-0.5!">
            {TRANSFER_OPTIONS.map((o) => (
              <button key={o.label} type="button" className="px-1.5! py-1!" aria-pressed={value.maxTransfers === o.value} onClick={() => set({ maxTransfers: o.value })}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      </Group>

      <Group label="Min change" hint="Minimum time to change trains" htmlFor="f-minconn">
        <MiniSelect id="f-minconn" items={MIN_CONNECTION} value={value.minConnection} onPick={(v) => set({ minConnection: v })} />
      </Group>

      <Group label="Max wait" hint="Longest single wait between trains" htmlFor="f-maxwait">
        <MiniSelect id="f-maxwait" items={MAX_LAYOVER} value={value.maxLayover} onPick={(v) => set({ maxLayover: v })} />
      </Group>

      {value.excludedTrains.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Without</span>
          {value.excludedTrains.map((t) => (
            <button
              key={t}
              className="chip bg-rose-50 font-mono text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
              onClick={() => set({ excludedTrains: value.excludedTrains.filter((x) => x !== t) })}
              aria-label={`Include train ${t} again`}
            >
              {t} ✕
            </button>
          ))}
        </div>
      )}

      {n > 0 && (
        <button className="ml-auto text-xs font-medium text-brand-600 hover:underline dark:text-brand-400" onClick={() => onChange(FILTER_DEFAULTS)}>
          Reset ({n})
        </button>
      )}
    </div>
  );
}
