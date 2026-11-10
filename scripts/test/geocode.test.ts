import { test } from "node:test";
import assert from "node:assert/strict";
import { edgeConsistent, fillByInterpolation, findOutliers, haversineKm, inIndia, interpolateAt, type LatLon } from "../lib/geocode.ts";

const s = (code: string, distance_km: number) => ({ code, distance_km });

test("haversine: one degree of latitude is about 111 km", () => {
  assert.ok(Math.abs(haversineKm([20, 78], [21, 78]) - 111.2) < 0.5);
  assert.equal(haversineKm([20, 78], [20, 78]), 0);
});

test("inIndia bounds", () => {
  assert.ok(inIndia([28.64, 77.22])); // New Delhi
  assert.ok(!inIndia([0, 0]));
  assert.ok(!inIndia([77.22, 28.64])); // swapped lat/lon
});

test("edge consistency allows rail detours but not teleporting", () => {
  assert.ok(edgeConsistent([20, 78], [21, 78], 130)); // 111 km straight, 130 km by rail
  assert.ok(!edgeConsistent([20, 78], [25, 78], 100)); // 556 km straight, 100 km by rail
});

test("interpolation is proportional to rail distance", () => {
  const coords = new Map<string, LatLon>([["A", [20, 78]], ["C", [22, 80]]]);
  const stops = [s("A", 0), s("B", 25), s("C", 100)];
  assert.deepEqual(interpolateAt(stops, 1, coords), [20.5, 78.5]);
  assert.equal(interpolateAt([s("B", 0), s("C", 10)], 0, coords), null); // no known stop before
});

test("interpolation skips unknown neighbours and uses the median across trains", () => {
  const coords = new Map<string, LatLon>([["A", [20, 78]], ["D", [23, 78]], ["E", [30, 78]]]);
  const routes = [
    [s("A", 0), s("X", 50), s("B", 100), s("D", 300)], // X at 1/6 of A..D -> lat 20.5
    [s("A", 0), s("B", 200), s("D", 300)],
    [s("D", 0), s("B", 10), s("E", 20)],
  ];
  const filled = fillByInterpolation(coords, routes, ["A", "B", "D", "E", "X"]);
  assert.deepEqual([...filled].sort(), ["B", "X"]);
  assert.equal(coords.get("X")![0], 20.5);
  // B estimates: route 1 -> 21 (100/300 of A..D), route 2 -> 22, route 3 -> 26.5; median 22
  assert.equal(coords.get("B")![0], 22);
});

test("outlier guard drops a station that disagrees with most neighbours, not its neighbours", () => {
  const coords = new Map<string, LatLon>([
    ["A", [20, 78]],
    ["B", [30, 90]], // wrong: should be near A and C
    ["C", [20.5, 78]],
    ["D", [21, 78]],
  ]);
  const routes = [
    [s("A", 0), s("B", 30), s("C", 60), s("D", 115)],
    [s("C", 0), s("B", 30), s("A", 60)],
  ];
  assert.deepEqual([...findOutliers(coords, routes)], ["B"]);
});
