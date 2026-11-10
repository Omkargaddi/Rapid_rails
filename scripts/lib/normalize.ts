// Pure validation / normalization functions for raw train schedule records.
// No I/O here so every rule is unit-testable.

export type Policy = "strict" | "correct" | "skip";

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export interface Issue {
  train: string;
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  stop?: number;
}

export interface CleanStop {
  seq: number;              // original sequence_number
  code: string;             // canonical station code, "" when the stop is a placeholder
  raw_code: string;
  name: string;             // cleaned display name for this stop
  raw_name: string;
  arr: number | null;       // minutes since 00:00 of the train's start date (day 1)
  dep: number | null;
  dist: number;
  boardable: boolean;       // false for placeholder / reversal points
}

export interface CleanTrain {
  number: string;
  name: string;
  type: string;
  route_id: string;
  classes: string[];
  link: string | null;
  days_mask: number;        // bit i set => runs when day-1 falls on WEEKDAYS[i] (0 = Sunday)
  stops: CleanStop[];
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CODE_RE = /^[A-Z0-9]{1,8}$/;

export function parseHHMM(t: unknown): number | null {
  if (typeof t !== "string") return null;
  const m = TIME_RE.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function normalizeCode(c: unknown): string {
  return typeof c === "string" ? c.trim().toUpperCase() : "";
}

export function isValidStationCode(c: string): boolean {
  return CODE_RE.test(c);
}

function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// Station names sometimes carry scraper artefacts: "SALEM JN SA Train Reversal",
// "KHAJURAHO KURJ" (code appended). Strip those; keep everything else verbatim.
export function cleanStationName(name: unknown, code: string): string {
  let n = collapseWs(typeof name === "string" ? name : "").toUpperCase();
  n = n.replace(/\s*TRAIN REVERSAL$/, "").trim();
  if (code) {
    const suffix = " " + code;
    if (n.endsWith(suffix) && n.length > suffix.length) n = n.slice(0, -suffix.length).trim();
  }
  return n;
}

/**
 * Absolute-time rule (validated against the full dataset: 0 violations):
 *   day_of_journey is the day of the DEPARTURE from a stop (for the last stop: of the arrival).
 *   dep = (doj-1)*1440 + dep_hhmm
 *   arr = (doj-1)*1440 + arr_hhmm, minus 1440 when arr_hhmm > dep_hhmm (arrived before midnight,
 *         left after midnight).
 * A naive "add a day whenever the clock wraps" unroll is wrong for this data because some listed
 * consecutive stops are more than 24 h apart.
 */
export function absoluteTimes(arrHHMM: number | null, depHHMM: number | null, doj: number): { arr: number | null; dep: number | null } {
  const base = (doj - 1) * 1440;
  const dep = depHHMM === null ? null : base + depHHMM;
  let arr = arrHHMM === null ? null : base + arrHHMM;
  if (arr !== null && depHHMM !== null && arrHHMM !== null && arrHHMM > depHHMM) arr -= 1440;
  return { arr, dep };
}

export function daysMask(od: unknown, issues: Issue[], train: string): number | null {
  if (!od || typeof od !== "object") {
    issues.push({ train, severity: "error", code: "OPERATING_DAYS_MISSING", message: "operating_days missing or not an object" });
    return null;
  }
  let mask = 0;
  const rec = od as Record<string, unknown>;
  for (let i = 0; i < 7; i++) {
    const v = rec[WEEKDAYS[i]];
    if (v === true) mask |= 1 << i;
    else if (v !== false) {
      issues.push({ train, severity: "warning", code: "OPERATING_DAY_INVALID", message: `operating_days.${WEEKDAYS[i]}=${JSON.stringify(v)} treated as false` });
    }
  }
  return mask;
}

export interface CleanResult {
  train: CleanTrain | null;
  issues: Issue[];
}

/**
 * Validate and normalize one raw record.
 *  - strict:  any warning-level deviation rejects the record
 *  - correct: fix what is safely fixable, log it, reject only unrecoverable records
 *  - skip:    like correct, but records needing a *correction* (not mere trimming) are skipped
 */
export function cleanRecord(raw: any, policy: Policy): CleanResult {
  const issues: Issue[] = [];
  const number = typeof raw?.train_number === "string" ? raw.train_number.trim() : String(raw?.train_number ?? "").trim();
  const t = number || "<unknown>";
  const reject = (code: string, message: string): CleanResult => {
    issues.push({ train: t, severity: "error", code, message });
    return { train: null, issues };
  };

  if (!number) return reject("TRAIN_NUMBER_MISSING", "train_number missing");
  if (!/^\d{5}$/.test(number)) issues.push({ train: t, severity: "info", code: "TRAIN_NUMBER_NONSTANDARD", message: `train_number "${number}" is not 5 digits (kept as opaque id)` });

  const routeId = typeof raw.route_id === "string" ? raw.route_id.trim() : "";
  if (!routeId) issues.push({ train: t, severity: "warning", code: "ROUTE_ID_MISSING", message: "route_id missing" });
  else if (!routeId.startsWith(number + "-")) issues.push({ train: t, severity: "warning", code: "ROUTE_ID_MISMATCH", message: `route_id ${routeId} does not start with train number` });

  const rawType = typeof raw.type === "string" ? raw.type : "";
  const type = collapseWs(rawType).toUpperCase() || "UNKNOWN";
  const name = collapseWs(typeof raw.train_name === "string" ? raw.train_name : "") || number;
  const classes = Array.isArray(raw.classes_available)
    ? [...new Set(raw.classes_available.filter((c: unknown) => typeof c === "string").map((c: string) => c.trim().toUpperCase()).filter(Boolean))] as string[]
    : [];
  if (classes.length === 0) issues.push({ train: t, severity: "info", code: "CLASSES_EMPTY", message: "classes_available empty" });

  const mask = daysMask(raw.operating_days, issues, t);
  if (mask === null) return { train: null, issues };
  if (mask === 0) return reject("NEVER_RUNS", "operating_days has no day set");

  const sched = raw.schedule;
  if (!Array.isArray(sched) || sched.length < 2) return reject("SCHEDULE_TOO_SHORT", "schedule missing or has < 2 stops");

  // Order by sequence_number if the array is out of order (stable, so ties keep input order).
  const seqs = sched.map((s: any) => s?.sequence_number);
  const ordered = seqs.every((v: unknown) => typeof v === "number");
  let list = sched as any[];
  if (ordered) {
    const sorted = [...list].sort((a, b) => a.sequence_number - b.sequence_number);
    if (sorted.some((s, i) => s !== list[i])) {
      issues.push({ train: t, severity: "warning", code: "SCHEDULE_REORDERED", message: "schedule was not ordered by sequence_number" });
      if (policy === "strict") return reject("STRICT_REJECT", "schedule out of order");
      list = sorted;
    }
    for (let i = 1; i < list.length; i++) {
      if (list[i].sequence_number === list[i - 1].sequence_number) return reject("SEQUENCE_DUPLICATE", `duplicate sequence_number ${list[i].sequence_number}`);
    }
  } else {
    issues.push({ train: t, severity: "warning", code: "SEQUENCE_MISSING", message: "sequence_number missing; array order used" });
  }

  const stops: CleanStop[] = [];
  let corrected = false;
  let prevTime = -Infinity;
  let prevDist = -Infinity;
  for (let i = 0; i < list.length; i++) {
    const s = list[i] ?? {};
    const first = i === 0, last = i === list.length - 1;
    let code = normalizeCode(s.station_code);
    const rawName = typeof s.station_name === "string" ? s.station_name : "";
    if (!isValidStationCode(code)) {
      // Scraped reversal points look like {code:"Point(4)", name:"MIRAJ JN. MRJ Train Reversal"}.
      // The real station code is embedded in the name; recover it rather than inventing one.
      const m = /\s([A-Z0-9]{1,8})\s+TRAIN REVERSAL$/i.exec(collapseWs(rawName));
      if (m) {
        issues.push({ train: t, severity: "warning", code: "CODE_RECOVERED_FROM_NAME", stop: i, message: `station_code ${JSON.stringify(s.station_code)} replaced by ${m[1].toUpperCase()} taken from name "${rawName}"` });
        code = m[1].toUpperCase();
      }
    }
    const boardable = isValidStationCode(code);
    if (!boardable) {
      issues.push({ train: t, severity: "warning", code: "PLACEHOLDER_STATION", stop: i, message: `station_code ${JSON.stringify(s.station_code)} (${rawName}) is not a real station; kept as non-boardable pass-through` });
    }
    let arrH = parseHHMM(s.arrival_time);
    let depH = parseHHMM(s.departure_time);
    if (s.arrival_time != null && arrH === null) return reject("TIME_INVALID", `stop ${i} arrival_time ${JSON.stringify(s.arrival_time)}`);
    if (s.departure_time != null && depH === null) return reject("TIME_INVALID", `stop ${i} departure_time ${JSON.stringify(s.departure_time)}`);

    if (first && arrH !== null) { issues.push({ train: t, severity: "info", code: "FIRST_HAS_ARRIVAL", stop: i, message: "arrival at origin ignored" }); arrH = null; }
    if (last && depH !== null) { issues.push({ train: t, severity: "info", code: "LAST_HAS_DEPARTURE", stop: i, message: "departure at terminus ignored" }); depH = null; }
    if (first && depH === null) return reject("ORIGIN_NO_DEPARTURE", "first stop has no departure_time");
    if (last && arrH === null) return reject("TERMINUS_NO_ARRIVAL", "last stop has no arrival_time");
    if (!first && !last) {
      if (arrH === null && depH === null) return reject("STOP_NO_TIMES", `stop ${i} has neither arrival nor departure`);
      if (arrH === null || depH === null) {
        issues.push({ train: t, severity: "warning", code: "INTERMEDIATE_TIME_MISSING", stop: i, message: "missing intermediate arrival/departure filled from the other" });
        corrected = true;
        if (arrH === null) arrH = depH; else depH = arrH;
      }
    }

    const doj = s.day_of_journey;
    if (!Number.isInteger(doj) || doj < 1 || doj > 10) return reject("DAY_OF_JOURNEY_INVALID", `stop ${i} day_of_journey ${JSON.stringify(doj)}`);
    const { arr, dep } = absoluteTimes(arrH, depH, doj);
    if (arr !== null && dep !== null && dep - arr > 360) {
      issues.push({ train: t, severity: "warning", code: "LONG_DWELL", stop: i, message: `dwell of ${dep - arr} min at ${code}` });
    }
    for (const v of [arr, dep]) {
      if (v === null) continue;
      if (v < prevTime) return reject("TIME_NOT_MONOTONE", `stop ${i} (${code}) time goes backwards under the day_of_journey rule`);
      prevTime = v;
    }

    let dist = typeof s.distance_km === "number" && Number.isFinite(s.distance_km) ? s.distance_km : NaN;
    if (Number.isNaN(dist)) {
      issues.push({ train: t, severity: "warning", code: "DISTANCE_INVALID", stop: i, message: "distance_km missing; carried forward" });
      dist = prevDist === -Infinity ? 0 : prevDist;
      corrected = true;
    } else if (dist < prevDist) {
      issues.push({ train: t, severity: "warning", code: "DISTANCE_DECREASING", stop: i, message: `distance ${dist} < previous ${prevDist}` });
      corrected = true;
      dist = prevDist;
    }
    prevDist = dist;

    stops.push({
      seq: typeof s.sequence_number === "number" ? s.sequence_number : i + 1,
      code: boardable ? code : "",
      raw_code: typeof s.station_code === "string" ? s.station_code : "",
      name: cleanStationName(rawName, boardable ? code : ""),
      raw_name: rawName,
      arr, dep, dist, boardable,
    });
  }

  if (stops.filter((s) => s.boardable).length < 2) return reject("TOO_FEW_BOARDABLE", "fewer than 2 real stations");
  const zeroHops = stops.slice(1).filter((s, i) => s.arr !== null && stops[i].dep !== null && s.arr === stops[i].dep).length;
  if (zeroHops) issues.push({ train: t, severity: "info", code: "ZERO_MINUTE_HOP", message: `${zeroHops} hop(s) with 0 min running time` });

  if (corrected && policy === "strict") return reject("STRICT_REJECT", "record needed correction");
  if (corrected && policy === "skip") return reject("SKIPPED_NEEDS_CORRECTION", "record needed correction");
  if (policy === "strict" && issues.some((x) => x.severity === "warning")) return reject("STRICT_REJECT", "record has warnings");

  return {
    train: {
      number, name, type, route_id: routeId || `${number}-${stops[0].code}-${stops[stops.length - 1].code}`,
      classes, link: typeof raw.link === "string" ? raw.link : null, days_mask: mask, stops,
    },
    issues,
  };
}

/** Content hash key used to detect duplicate records (same timetable + same days). */
export function timetableKey(t: CleanTrain): string {
  return t.days_mask + "|" + t.stops.map((s) => `${s.code}@${s.arr}/${s.dep}`).join(";");
}
