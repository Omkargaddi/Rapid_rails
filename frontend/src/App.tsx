import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { JourneyCard } from "@/components/JourneyCard";
import { MapPanel } from "@/components/MapPanel";
import { SearchForm, type SearchInput } from "@/components/SearchForm";
import { SortBar } from "@/components/SortBar";
import { highlightBadges, SummaryStrip } from "@/components/SummaryStrip";
import { MAX_RESULTS, RequestError, searchRoutes } from "@/lib/api";
import {
  applyFilters,
  FILTER_DEFAULTS,
  filtersFromParams,
  filtersToParams,
  sortJourneys,
  type FilterState,
  type SortKey,
} from "@/lib/filters";
import { hhmm, shortDate, todayIso } from "@/lib/format";
import type { RouteResponse, StationHit } from "@/lib/types";

const PAGE_SIZE = 10;

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; data: RouteResponse };

type Search = { from: StationHit; to: StationHit; date: string; time: string };

export default function App() {
  const [initial, setInitial] = useState<SearchInput | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [sort, setSort] = useState<SortKey>("arrival");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list"); // below lg only
  const [draft, setDraft] = useState<{ from: StationHit | null; to: StationHit | null }>({ from: null, to: null });
  const lastSearch = useRef<Search | null>(null);

  const run = useCallback(async (v: Search, opts: { fresh: boolean }) => {
    lastSearch.current = v;
    setState({ kind: "loading" });
    setPage(1);
    setSelectedId(null);
    setDraft({ from: v.from, to: v.to });
    if (opts.fresh) setFilters((f) => ({ ...f, excludedTrains: [] }));
    try {
      const data = await searchRoutes({ source: v.from.code, destination: v.to.code, date: v.date, time: v.time });
      setState({ kind: "done", data });
    } catch (e) {
      const err = e as RequestError;
      setState({ kind: "error", message: err.details?.length ? err.details.map((d) => d.message).join("; ") : err.message });
    }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const restored = filtersFromParams(p);
    setFilters(restored.filters);
    setSort(restored.sort);
    const now = new Date();
    const base: SearchInput = {
      from: null,
      to: null,
      date: p.get("date") || todayIso(),
      time: p.get("time") || `${String(now.getHours()).padStart(2, "0")}:00`,
    };
    const codes = [p.get("from"), p.get("to")];
    if (!codes[0] || !codes[1]) return setInitial(base);
    Promise.all(codes.map((c) => fetch(`/api/stations/${encodeURIComponent(c!)}`).then((r) => (r.ok ? (r.json() as Promise<StationHit>) : null))))
      .then(([from, to]) => {
        const v = { ...base, from, to };
        setInitial(v);
        setDraft({ from, to });
        if (from && to) void run({ from, to, date: v.date, time: v.time }, { fresh: false });
      })
      .catch(() => setInitial(base));
  }, [run]);

  useEffect(() => {
    const s = lastSearch.current;
    if (!s && state.kind === "idle") return;
    const p = new URLSearchParams();
    if (s) {
      p.set("from", s.from.code);
      p.set("to", s.to.code);
      p.set("date", s.date);
      p.set("time", s.time);
    }
    filtersToParams(filters, sort, p);
    window.history.replaceState(null, "", `?${p}`);
  }, [filters, sort, state.kind]);

  const all = useMemo(() => (state.kind === "done" ? state.data.routes : []), [state]);
  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);
  const sorted = useMemo(() => sortJourneys(filtered, sort), [filtered, sort]);
  const badges = useMemo(() => highlightBadges(filtered), [filtered]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const shown = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [filters, sort]);
  // Keep a journey selected for the map: the first one, unless the current pick is still listed.
  useEffect(() => {
    if (!sorted.some((j) => j.id === selectedId)) setSelectedId(sorted[0]?.id ?? null);
  }, [sorted, selectedId]);

  const reveal = useCallback(
    (id: string) => {
      setSelectedId(id);
      const i = sorted.findIndex((j) => j.id === id);
      if (i >= 0) setPage(Math.floor(i / PAGE_SIZE) + 1);
      requestAnimationFrame(() => document.getElementById(`journey-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    },
    [sorted],
  );

  const excludeTrain = (n: string) => setFilters((f) => (f.excludedTrains.includes(n) ? f : { ...f, excludedTrains: [...f.excludedTrains, n] }));
  const done = state.kind === "done";

  return (
    <main className="min-h-screen pb-16">
      {/* hero band behind the search form */}
      <div className="relative overflow-hidden bg-linear-to-br from-brand-700 via-brand-600 to-indigo-900 pb-24 text-white dark:from-brand-900 dark:via-slate-900 dark:to-slate-950">
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
          <defs>
            <pattern id="rails" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M0 24h48M0 30h48M8 20v14M24 20v14M40 20v14" stroke="white" strokeWidth="1.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rails)" />
        </svg>
        <div className="relative mx-auto max-w-[1440px] px-4">
          <header className="flex items-center gap-3 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="13" rx="3" />
                <path d="M5 11h14M9 20l-2 2M15 20l2 2M9 16v4M15 16v4" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">RailRoute</span>
            <span className="ml-auto hidden text-xs text-white/70 sm:block">Exact K-best earliest-arrival routing · 2,894 stations · 1,725 trains</span>
          </header>
          {done ? (
            <h1 className="sr-only">Journeys</h1>
          ) : (
            <div className="pb-4 pt-6">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find the fastest way there, changes included.</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
                Direct trains and multi-transfer connections are ranked together by arrival time. The 50 best journeys, drawn on the map.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="relative mx-auto -mt-20 max-w-[1440px] px-4">
        {initial ? (
          <SearchForm
            initial={initial}
            loading={state.kind === "loading"}
            onSearch={(v) => void run(v, { fresh: true })}
            onStationsChange={(from, to) => setDraft({ from, to })}
          />
        ) : (
          <div className="card h-[180px] animate-pulse" />
        )}

        {done && (
          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-1">
            <h2 className="min-w-0 text-sm">
              <span className="font-semibold">{state.data.query.source_name}</span> <span className="font-mono text-xs text-slate-400">{state.data.query.source}</span>
              <span className="mx-2 text-slate-400">→</span>
              <span className="font-semibold">{state.data.query.destination_name}</span>{" "}
              <span className="font-mono text-xs text-slate-400">{state.data.query.destination}</span>
            </h2>
            <p className="text-xs text-slate-500">
              from {shortDate(state.data.query.search_datetime)} {hhmm(state.data.query.search_datetime)}
              {state.data.meta.engine_ms !== null && <> · routed in {state.data.meta.engine_ms.toFixed(0)} ms</>}
              {state.data.meta.cached && <> · cached</>}
            </p>
          </div>
        )}

        <div id="results" className={`mt-4 grid scroll-mt-4 gap-5 ${done ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"}`}>
          {/* list column */}
          <section className={`min-w-0 space-y-3 ${view === "map" ? "hidden lg:block" : ""}`} aria-live="polite">
            {state.kind === "idle" && (
              <div className="card space-y-4 p-6 text-sm text-slate-600 dark:text-slate-300">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">How it works</h2>
                <ol className="space-y-3">
                  {[
                    ["Pick two stations", "Type a name or a code. The map pins them as you go."],
                    ["Search", "The engine finds the 50 earliest-arriving journeys, with up to 10 changes of train and at least 30 minutes to change."],
                    ["Narrow it down", "Direct trains only, fewer changes, enough time to change trains, no long waits, or leave out a train."],
                  ].map(([t, d], i) => (
                    <li key={t} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                        {i + 1}
                      </span>
                      <span>
                        <span className="font-medium text-slate-900 dark:text-white">{t}.</span> {d}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {state.kind === "loading" &&
              [0, 1, 2].map((i) => (
                <div key={i} className="card space-y-3 p-4">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-8 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
                </div>
              ))}
            {state.kind === "error" && (
              <div role="alert" className="card border-rose-200 p-5 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
                {state.message}
              </div>
            )}
            {done && (
              <>
                {all.length > 0 && <FilterBar value={filters} onChange={setFilters} />}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {filtered.length} of {all.length} journeys
                  </span>
                  <div className="ml-auto">
                    <SortBar value={sort} onChange={setSort} />
                  </div>
                </div>
                <SummaryStrip journeys={filtered} selectedId={selectedId} onPick={reveal} />
                {!state.data.meta.search_complete && all.length > 0 && (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    The search reached its work limit; the journeys shown are the fastest found, in exact order, but there may be fewer than {MAX_RESULTS}.
                  </p>
                )}
                {all.length === 0 && (
                  <div className="card p-8 text-center text-sm text-slate-500">{state.data.message ?? "No valid journey found for the specified date and time."}</div>
                )}
                {all.length > 0 && filtered.length === 0 && (
                  <div className="card p-8 text-center text-sm text-slate-500">
                    No journey matches the selected filters.{" "}
                    <button className="font-medium text-brand-600 hover:underline" onClick={() => setFilters(FILTER_DEFAULTS)}>
                      Reset filters
                    </button>
                  </div>
                )}
                {shown.map((j) => (
                  <JourneyCard
                    key={j.id}
                    j={j}
                    badges={badges.get(j.id) ?? []}
                    selected={j.id === selectedId}
                    onSelect={() => setSelectedId(j.id)}
                    onHover={(on) => setHoverId(on ? j.id : null)}
                    onExcludeTrain={excludeTrain}
                  />
                ))}
                {pages > 1 && (
                  <nav className="flex items-center justify-center gap-1 pt-2" aria-label="Pagination">
                    <button className="rounded-lg px-3 py-1.5 text-sm disabled:opacity-40" disabled={page === 1} onClick={() => setPage(page - 1)}>
                      ‹ Prev
                    </button>
                    {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        aria-current={p === page ? "page" : undefined}
                        onClick={() => setPage(p)}
                        className={`tabular h-8 w-8 rounded-lg text-sm ${p === page ? "bg-brand-600 font-semibold text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button className="rounded-lg px-3 py-1.5 text-sm disabled:opacity-40" disabled={page === pages} onClick={() => setPage(page + 1)}>
                      Next ›
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>

          <MapPanel
            journeys={sorted}
            selectedId={selectedId}
            hoverId={hoverId}
            onSelect={reveal}
            endpoints={draft}
            className={
              done
                ? `h-[70vh] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:self-start ${view === "list" ? "hidden lg:block" : ""}`
                : "h-[380px] sm:h-[460px] lg:h-auto lg:min-h-[460px]"
            }
          />
        </div>

        <footer className="mt-12 text-center text-xs text-slate-400">
          Times are timetable times (IST). Minimum transfer time 30 minutes. Routing: exact K-best earliest-arrival search in C++. Station locations: datameet
          (CC0), map tiles © Esri, OpenStreetMap contributors.
        </footer>
      </div>

      {done && all.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-[900] flex justify-center lg:hidden">
          <div className="segmented grid-cols-2 bg-slate-900/90! p-1 shadow-lift backdrop-blur dark:bg-slate-800/95!">
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => {
                  setView(v);
                  document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5! text-slate-300! aria-pressed:text-slate-900! dark:aria-pressed:text-white!"
              >
                {v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
