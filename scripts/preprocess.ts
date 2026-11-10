#!/usr/bin/env node
// Preprocessing pipeline:
//   raw JSON -> validation -> normalization -> dedup -> station master -> temporal normalization
//   -> data/processed/{timetable,stations}.json + data/reports/quality-report.{json,md}
//
// Usage: node preprocess.ts [--raw DIR] [--out DIR] [--reports DIR] [--policy strict|correct|skip]
// Env equivalents: RAW_DATA_DIR, PROCESSED_DIR, REPORTS_DIR, CLEAN_POLICY.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanRecord, timetableKey, WEEKDAYS, type CleanTrain, type Issue, type Policy } from "./lib/normalize.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function arg(name: string, env: string, def: string): string {
  const i = process.argv.indexOf("--" + name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env[env] ?? def;
}

const RAW = resolve(arg("raw", "RAW_DATA_DIR", join(root, "train_data")));
const OUT = resolve(arg("out", "PROCESSED_DIR", join(root, "data/processed")));
const REPORTS = resolve(arg("reports", "REPORTS_DIR", join(root, "data/reports")));
const POLICY = arg("policy", "CLEAN_POLICY", "correct") as Policy;
if (!["strict", "correct", "skip"].includes(POLICY)) throw new Error(`invalid policy ${POLICY}`);

const t0 = performance.now();
const issues: Issue[] = [];
const rawRecords: { file: string; rec: any }[] = [];
const files = readdirSync(RAW).filter((f) => f.endsWith(".json")).sort();
for (const f of files) {
  const p = join(RAW, f);
  if (!statSync(p).isFile()) continue;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    issues.push({ train: f, severity: "error", code: "JSON_PARSE_ERROR", message: String(e) });
    continue;
  }
  for (const rec of Array.isArray(parsed) ? parsed : [parsed]) rawRecords.push({ file: f, rec });
}

// ---- raw statistics (before cleaning) -------------------------------------------------------
const count = <T,>(xs: T[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>());
const sortedEntries = (m: Map<any, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
const rawStops = rawRecords.flatMap((r) => (Array.isArray(r.rec?.schedule) ? r.rec.schedule : []));
const stopsPerTrain = rawRecords.map((r) => (Array.isArray(r.rec?.schedule) ? r.rec.schedule.length : 0)).sort((a, b) => a - b);
const rawStats = {
  files: files.length,
  records: rawRecords.length,
  unique_train_numbers: new Set(rawRecords.map((r) => r.rec?.train_number)).size,
  unique_route_ids: new Set(rawRecords.map((r) => r.rec?.route_id)).size,
  unique_station_codes: new Set(rawStops.map((s: any) => s?.station_code)).size,
  total_stops: rawStops.length,
  stops_per_train: {
    min: stopsPerTrain[0] ?? 0,
    median: stopsPerTrain[Math.floor(stopsPerTrain.length / 2)] ?? 0,
    mean: +(rawStops.length / Math.max(1, rawRecords.length)).toFixed(2),
    max: stopsPerTrain[stopsPerTrain.length - 1] ?? 0,
  },
  day_of_journey: Object.fromEntries(sortedEntries(count(rawStops.map((s: any) => s?.day_of_journey)))),
  types_raw: Object.fromEntries(sortedEntries(count(rawRecords.map((r) => JSON.stringify(r.rec?.type))))),
  classes: Object.fromEntries(sortedEntries(count(rawRecords.flatMap((r) => r.rec?.classes_available ?? [])))),
  operating_days_per_week: Object.fromEntries(
    [...count(rawRecords.map((r) => WEEKDAYS.filter((d) => r.rec?.operating_days?.[d] === true).length)).entries()].sort((a, b) => a[0] - b[0]),
  ),
  extra_stop_keys: Object.fromEntries(sortedEntries(count(rawStops.flatMap((s: any) => Object.keys(s ?? {}).filter((k) => !["arrival_time", "day_of_journey", "departure_time", "distance_km", "sequence_number", "station_code", "station_name"].includes(k)))))),
};

// ---- clean ------------------------------------------------------------------------------------
const cleaned: CleanTrain[] = [];
let rejected = 0;
for (const { file, rec } of rawRecords) {
  const r = cleanRecord(rec, POLICY);
  for (const i of r.issues) issues.push({ ...i, message: `${file}: ${i.message}` });
  if (r.train) cleaned.push(r.train);
  else rejected++;
}

// ---- deduplicate ------------------------------------------------------------------------------
// 1. Same train_number twice: keep the record with more stops (then first seen).
// 2. Identical timetable + days + name under another number: a copy, drop it.
// 3. Identical timetable + days but a different name/number: genuinely distinct service, keep + warn.
const byNumber = new Map<string, CleanTrain>();
for (const t of cleaned) {
  const prev = byNumber.get(t.number);
  if (!prev) { byNumber.set(t.number, t); continue; }
  const keep = t.stops.length > prev.stops.length ? t : prev;
  issues.push({ train: t.number, severity: "warning", code: "DUPLICATE_TRAIN_NUMBER", message: `duplicate train_number; kept route ${keep.route_id}` });
  byNumber.set(t.number, keep);
}
const byTimetable = new Map<string, CleanTrain>();
const trains: CleanTrain[] = [];
for (const t of [...byNumber.values()].sort((a, b) => a.number.localeCompare(b.number))) {
  const k = timetableKey(t);
  const prev = byTimetable.get(k);
  if (prev && prev.name === t.name) {
    issues.push({ train: t.number, severity: "warning", code: "DUPLICATE_RECORD", message: `identical to ${prev.number}; dropped` });
    continue;
  }
  if (prev) issues.push({ train: t.number, severity: "info", code: "IDENTICAL_TIMETABLE", message: `same timetable and days as ${prev.number} but different name; kept` });
  else byTimetable.set(k, t);
  trains.push(t);
}
// Same stops/times but different operating days (e.g. 12881/12887) are not duplicates: noted only.
const byStopsOnly = new Map<string, string[]>();
for (const t of trains) {
  const k = t.stops.map((s) => `${s.code}@${s.arr}/${s.dep}`).join(";");
  byStopsOnly.set(k, [...(byStopsOnly.get(k) ?? []), t.number]);
}
for (const group of byStopsOnly.values()) {
  if (group.length > 1) issues.push({ train: group.join(","), severity: "info", code: "SHARED_TIMETABLE_DIFFERENT_DAYS", message: `trains ${group.join(", ")} share stops/times but differ in days or name; kept as distinct` });
}

// ---- station master ---------------------------------------------------------------------------
interface StationAgg { names: Map<string, number>; raw: Set<string>; trains: Set<string> }
const agg = new Map<string, StationAgg>();
for (const t of trains) {
  const seenInTrain = new Set<string>();
  for (const s of t.stops) {
    if (!s.boardable) continue;
    let a = agg.get(s.code);
    if (!a) agg.set(s.code, (a = { names: new Map(), raw: new Set(), trains: new Set() }));
    a.names.set(s.name, (a.names.get(s.name) ?? 0) + 1);
    a.raw.add(s.raw_name.trim());
    if (!seenInTrain.has(s.code)) { a.trains.add(t.number); seenInTrain.add(s.code); }
    else issues.push({ train: t.number, severity: "info", code: "STATION_REPEATED_IN_TRAIN", message: `${s.code} visited twice (loop/ring service)` });
  }
}
const stations = [...agg.entries()]
  .map(([code, a]) => {
    const ranked = [...a.names.entries()].sort((x, y) => y[1] - x[1] || y[0].length - x[0].length || x[0].localeCompare(y[0]));
    if (ranked.length > 1) {
      issues.push({ train: "-", severity: ranked.length > 1 ? "warning" : "info", code: "STATION_NAME_VARIANTS", message: `${code}: ${ranked.map(([n, c]) => `"${n}"x${c}`).join(", ")}; canonical "${ranked[0][0]}"` });
    }
    return {
      code,
      name: ranked[0][0],
      all_known_names: [...a.raw].sort(),
      train_count: a.trains.size,
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));
const nameToCodes = new Map<string, string[]>();
for (const s of stations) nameToCodes.set(s.name, [...(nameToCodes.get(s.name) ?? []), s.code]);
for (const [n, codes] of nameToCodes) {
  if (codes.length > 1) issues.push({ train: "-", severity: "info", code: "NAME_SHARED_BY_CODES", message: `"${n}" used by ${codes.join(", ")} (kept as distinct stations)` });
}
const stationIndex = new Map(stations.map((s, i) => [s.code, i]));

// ---- emit -------------------------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
mkdirSync(REPORTS, { recursive: true });

// No timestamp in the timetable: its bytes must depend only on the raw data and the policy, because the
// engine and the API each build it and compare its FNV-1a 64 hash.
const generatedAt = new Date().toISOString();
const timetable = {
  format: "railway-timetable/v1",
  time_model: "minutes relative to 00:00 of the train's start date (day_of_journey 1); days bitmask bit0=Sunday..bit6=Saturday refers to the start date",
  stations: stations.map((s) => ({ code: s.code, name: s.name })),
  trains: trains.map((t) => ({
    number: t.number,
    name: t.name,
    type: t.type,
    route_id: t.route_id,
    classes: t.classes,
    days: t.days_mask,
    // [station_index or -1, arrival_min or -1, departure_min or -1, distance_km, placeholder_name?]
    stops: t.stops.map((s) => {
      const row: (number | string)[] = [s.boardable ? stationIndex.get(s.code)! : -1, s.arr ?? -1, s.dep ?? -1, s.dist];
      if (!s.boardable) row.push(s.name || "UNNAMED POINT");
      return row;
    }),
  })),
};
writeFileSync(join(OUT, "timetable.json"), JSON.stringify(timetable));
writeFileSync(join(OUT, "stations.json"), JSON.stringify(stations, null, 1));
writeFileSync(join(OUT, "trains.json"), JSON.stringify(trains.map((t) => ({
  number: t.number, name: t.name, type: t.type, route_id: t.route_id, classes: t.classes, link: t.link,
  operating_days: Object.fromEntries(WEEKDAYS.map((d, i) => [d, (t.days_mask >> i & 1) === 1])),
  stops: t.stops.map((s) => ({ seq: s.seq, code: s.code || null, name: s.name, arr_min: s.arr, dep_min: s.dep, distance_km: s.dist, boardable: s.boardable })),
}))));

const bySeverity = Object.fromEntries(sortedEntries(count(issues.map((i) => i.severity))));
const byCode = Object.fromEntries(sortedEntries(count(issues.map((i) => i.code))));
const cleanStats = {
  policy: POLICY,
  accepted_trains: trains.length,
  rejected_records: rejected,
  stations: stations.length,
  stations_served_by_one_train: stations.filter((s) => s.train_count === 1).length,
  boardable_stops: trains.reduce((n, t) => n + t.stops.filter((s) => s.boardable).length, 0),
  placeholder_stops: trains.reduce((n, t) => n + t.stops.filter((s) => !s.boardable).length, 0),
  types: Object.fromEntries(sortedEntries(count(trains.map((t) => t.type)))),
  max_span_minutes: Math.max(...trains.map((t) => t.stops[t.stops.length - 1].arr! - t.stops[0].dep!)),
  top_stations: stations.slice().sort((a, b) => b.train_count - a.train_count).slice(0, 15).map((s) => `${s.code}:${s.train_count}`),
};
const report = { raw: rawStats, cleaned: cleanStats, issue_counts: { by_severity: bySeverity, by_code: byCode }, issues };
writeFileSync(join(REPORTS, "quality-report.json"), JSON.stringify(report, null, 1));

const md: string[] = [
  "# Data quality report",
  "",
  `Generated ${generatedAt} from \`${RAW}\` with policy \`${POLICY}\`.`,
  "",
  "## Raw dataset",
  "```json",
  JSON.stringify(rawStats, null, 2),
  "```",
  "## After cleaning",
  "```json",
  JSON.stringify(cleanStats, null, 2),
  "```",
  "## Issue counts",
  "| code | count |",
  "|---|---|",
  ...Object.entries(byCode).map(([k, v]) => `| ${k} | ${v} |`),
  "",
  "## Warnings and errors",
  ...issues.filter((i) => i.severity !== "info").map((i) => `- **${i.severity}** \`${i.code}\` ${i.train}${i.stop !== undefined ? ` stop#${i.stop}` : ""}: ${i.message}`),
  "",
];
writeFileSync(join(REPORTS, "quality-report.md"), md.join("\n"));

console.log(JSON.stringify({
  msg: "preprocess complete",
  ms: Math.round(performance.now() - t0),
  records: rawRecords.length,
  accepted: trains.length,
  rejected,
  stations: stations.length,
  issues: bySeverity,
  out: OUT,
}));
