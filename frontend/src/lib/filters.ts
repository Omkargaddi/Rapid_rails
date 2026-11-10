import type { Journey } from "./types";

export interface FilterState {
  directOnly: boolean;
  maxTransfers: number | null; //     null = any
  minConnection: number | null; //   minutes; every transfer wait must be at least this
  maxLayover: number | null; //      minutes; no single transfer wait longer than this
  excludedTrains: string[]; //        train numbers that must not appear
}

export const FILTER_DEFAULTS: FilterState = {
  directOnly: false,
  maxTransfers: null,
  minConnection: null,
  maxLayover: null,
  excludedTrains: [],
};

type Predicate = { id: keyof FilterState; active: (f: FilterState) => boolean; test: (j: Journey, f: FilterState) => boolean };

const PREDICATES: Predicate[] = [
  { id: "directOnly", active: (f) => f.directOnly, test: (j) => j.transfer_count === 0 },
  { id: "maxTransfers", active: (f) => f.maxTransfers !== null, test: (j, f) => j.transfer_count <= f.maxTransfers! },
  { id: "minConnection", active: (f) => f.minConnection !== null, test: (j, f) => j.transfers.every((t) => t.wait_minutes >= f.minConnection!) },
  { id: "maxLayover", active: (f) => f.maxLayover !== null, test: (j, f) => j.transfers.every((t) => t.wait_minutes <= f.maxLayover!) },
  { id: "excludedTrains", active: (f) => f.excludedTrains.length > 0, test: (j, f) => !j.train_numbers.some((n) => f.excludedTrains.includes(n)) },
];

export function applyFilters(journeys: Journey[], f: FilterState): Journey[] {
  const active = PREDICATES.filter((p) => p.active(f));
  return journeys.filter((j) => active.every((p) => p.test(j, f)));
}

export function activeFilterCount(f: FilterState): number {
  return PREDICATES.filter((p) => p.active(f)).length;
}

// ---- sorting (reorders the fetched journeys; never changes which journeys were found) ---------------------

export type SortKey = "arrival" | "duration" | "transfers" | "waiting" | "distance";

export const SORTS: { id: SortKey; label: string; key: (j: Journey) => number }[] = [
  { id: "arrival", label: "Earliest arrival", key: (j) => j.rank },
  { id: "duration", label: "Shortest trip", key: (j) => j.duration_minutes },
  { id: "transfers", label: "Fewest transfers", key: (j) => j.transfer_count },
  { id: "waiting", label: "Least waiting", key: (j) => j.waiting_minutes },
  { id: "distance", label: "Shortest distance", key: (j) => j.distance_km },
];

export function sortJourneys(journeys: Journey[], by: SortKey): Journey[] {
  const key = SORTS.find((s) => s.id === by)!.key;
  return [...journeys].sort((a, b) => key(a) - key(b) || a.rank - b.rank);
}

// ---- URL state -----------------------------------------------------------------------------------

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const num = (v: string | null) => (v && Number.isFinite(Number(v)) ? Number(v) : null);

export function filtersToParams(f: FilterState, sort: SortKey, p: URLSearchParams): void {
  const set = (k: string, v: string | null) => (v ? p.set(k, v) : p.delete(k));
  set("direct", f.directOnly ? "1" : null);
  set("maxtr", f.maxTransfers === null ? null : String(f.maxTransfers));
  set("minconn", f.minConnection === null ? null : String(f.minConnection));
  set("maxwait", f.maxLayover === null ? null : String(f.maxLayover));
  set("xtrain", f.excludedTrains.join(",") || null);
  set("sort", sort === "arrival" ? null : sort);
}

export function filtersFromParams(p: URLSearchParams): { filters: FilterState; sort: SortKey } {
  const sort = p.get("sort");
  return {
    filters: {
      directOnly: p.get("direct") === "1",
      maxTransfers: num(p.get("maxtr")),
      minConnection: num(p.get("minconn")),
      maxLayover: num(p.get("maxwait")),
      excludedTrains: list(p.get("xtrain")),
    },
    sort: SORTS.some((s) => s.id === sort) ? (sort as SortKey) : "arrival",
  };
}
