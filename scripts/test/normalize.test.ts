import { test } from "node:test";
import assert from "node:assert/strict";
import { absoluteTimes, cleanRecord, cleanStationName, parseHHMM } from "../lib/normalize.ts";

const days = { sunday: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true };
const stop = (seq: number, code: string, arr: string | null, dep: string | null, doj: number, dist: number) =>
  ({ sequence_number: seq, station_code: code, station_name: code + " JN", arrival_time: arr, departure_time: dep, day_of_journey: doj, distance_km: dist });
const rec = (schedule: any[], extra: any = {}) =>
  ({ train_number: "12345", train_name: "TEST EXP", type: "SUPERFAST ", route_id: "12345-A-C", classes_available: ["SL"], operating_days: days, link: null, schedule, ...extra });

test("parseHHMM", () => {
  assert.equal(parseHHMM("00:00"), 0);
  assert.equal(parseHHMM("23:59"), 1439);
  assert.equal(parseHHMM("24:00"), null);
  assert.equal(parseHHMM("7:05"), null);
  assert.equal(parseHHMM(null), null);
});

test("absolute times: day_of_journey is the departure day", () => {
  // KUR 23:45 / 00:05 doj 2 -> arrived day 1 23:45, departed day 2 00:05
  assert.deepEqual(absoluteTimes(23 * 60 + 45, 5, 2), { arr: 1425, dep: 1445 });
  assert.deepEqual(absoluteTimes(10 * 60, 10 * 60 + 5, 2), { arr: 2040, dep: 2045 });
  assert.deepEqual(absoluteTimes(15 * 60, null, 3), { arr: 2 * 1440 + 900, dep: null });
});

test("overnight train normalizes monotonically", () => {
  const r = cleanRecord(rec([stop(1, "A", null, "22:30", 1, 0), stop(2, "B", "23:45", "00:05", 2, 30), stop(3, "C", "03:05", null, 2, 180)]), "correct");
  assert.ok(r.train);
  assert.deepEqual(r.train!.stops.map((s) => [s.arr, s.dep]), [[null, 1350], [1425, 1445], [1625, null]]);
  assert.equal(r.train!.type, "SUPERFAST");
});

test("time going backwards is rejected", () => {
  const r = cleanRecord(rec([stop(1, "A", null, "10:00", 1, 0), stop(2, "B", "09:00", null, 1, 10)]), "correct");
  assert.equal(r.train, null);
  assert.ok(r.issues.some((i) => i.code === "TIME_NOT_MONOTONE"));
});

test("reversal placeholder recovers code from name", () => {
  const s = [stop(1, "A", null, "10:00", 1, 0), { ...stop(2, "Point(4)", "11:00", "11:10", 1, 50), station_name: "MIRAJ JN. MRJ Train Reversal" }, stop(3, "C", "12:00", null, 1, 90)];
  const r = cleanRecord(rec(s), "correct");
  assert.equal(r.train!.stops[1].code, "MRJ");
  assert.equal(r.train!.stops[1].name, "MIRAJ JN.");
  assert.equal(cleanStationName("MIRAJ JN. MRJ Train Reversal", "MRJ"), "MIRAJ JN.");
});

test("unrecoverable placeholder becomes non-boardable", () => {
  const s = [stop(1, "A", null, "10:00", 1, 0), stop(2, "Point(4)", "11:00", "11:10", 1, 50), stop(3, "C", "12:00", null, 1, 90)];
  const r = cleanRecord(rec(s), "correct");
  assert.equal(r.train!.stops[1].boardable, false);
});

test("missing intermediate time: corrected vs strict vs skip", () => {
  const s = [stop(1, "A", null, "10:00", 1, 0), stop(2, "B", null, "11:00", 1, 50), stop(3, "C", "12:00", null, 1, 90)];
  assert.equal(cleanRecord(rec(s), "correct").train!.stops[1].arr, 660);
  assert.equal(cleanRecord(rec(s), "strict").train, null);
  assert.equal(cleanRecord(rec(s), "skip").train, null);
});

test("never-running train rejected", () => {
  const off = Object.fromEntries(Object.keys(days).map((d) => [d, false]));
  assert.equal(cleanRecord(rec([stop(1, "A", null, "10:00", 1, 0), stop(2, "B", "11:00", null, 1, 5)], { operating_days: off }), "correct").train, null);
});

test("days mask bit0 = sunday", () => {
  const only = { ...Object.fromEntries(Object.keys(days).map((d) => [d, false])), monday: true };
  const r = cleanRecord(rec([stop(1, "A", null, "10:00", 1, 0), stop(2, "B", "11:00", null, 1, 5)], { operating_days: only }), "correct");
  assert.equal(r.train!.days_mask, 0b10);
});
