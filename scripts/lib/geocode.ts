// Pure geocoding rules: join station codes to an external coordinate set, reject coordinates that
// disagree with the timetable's own distances, and fill the gaps by interpolating along train routes.

export type LatLon = [number, number];

export interface GeoStop {
  code: string;
  distance_km: number;
}

// Generous box around India (plus the Nepal/Bangladesh border stations the network touches).
export const INDIA_BOUNDS = { minLat: 6, maxLat: 37.5, minLon: 68, maxLon: 97.5 };

export function inIndia([lat, lon]: LatLon): boolean {
  const b = INDIA_BOUNDS;
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
}

export function haversineKm([lat1, lon1]: LatLon, [lat2, lon2]: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/**
 * An adjacent-stop pair is inconsistent when the straight-line distance between the two points is
 * longer than the rail distance allows (rail distance is always >= the straight line, so a large
 * ratio means one of the coordinates is wrong). `slackKm` absorbs rounding on short hops.
 */
export function edgeConsistent(a: LatLon, b: LatLon, railKm: number, ratio = 1.6, slackKm = 25): boolean {
  return haversineKm(a, b) <= ratio * Math.abs(railKm) + slackKm;
}

/**
 * Stations whose coordinates disagree with most of their timetable neighbours. A station qualifies
 * when it has at least `minEdges` checked neighbours and more than half are inconsistent. One bad
 * point also makes its correct neighbours look bad, so the worst station (most inconsistent edges)
 * is removed first and the counts are recomputed, until nothing qualifies.
 */
export function findOutliers(coords: Map<string, LatLon>, routes: GeoStop[][], minEdges = 2): Set<string> {
  const out = new Set<string>();
  const known = (c: string) => (out.has(c) ? undefined : coords.get(c));
  for (;;) {
    const checked = new Map<string, number>();
    const bad = new Map<string, number>();
    const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    for (const stops of routes) {
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i - 1];
        const b = stops[i];
        const pa = known(a.code);
        const pb = known(b.code);
        if (!pa || !pb || a.code === b.code) continue;
        bump(checked, a.code);
        bump(checked, b.code);
        if (!edgeConsistent(pa, pb, b.distance_km - a.distance_km)) {
          bump(bad, a.code);
          bump(bad, b.code);
        }
      }
    }
    let worst: string | null = null;
    let worstBad = 0;
    for (const [code, n] of checked) {
      const nb = bad.get(code) ?? 0;
      if (n >= minEdges && nb * 2 > n && nb > worstBad) {
        worst = code;
        worstBad = nb;
      }
    }
    if (!worst) return out;
    out.add(worst);
  }
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Position a stop between the nearest known stops before and after it on the same train, in
 * proportion to rail distance. Returns null when either side has no known stop.
 */
export function interpolateAt(stops: GeoStop[], i: number, coords: Map<string, LatLon>): LatLon | null {
  let p = i - 1;
  while (p >= 0 && !coords.has(stops[p].code)) p--;
  let n = i + 1;
  while (n < stops.length && !coords.has(stops[n].code)) n++;
  if (p < 0 || n >= stops.length) return null;
  const a = coords.get(stops[p].code)!;
  const b = coords.get(stops[n].code)!;
  const span = stops[n].distance_km - stops[p].distance_km;
  const t = span > 0 ? Math.min(1, Math.max(0, (stops[i].distance_km - stops[p].distance_km) / span)) : 0.5;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Fill missing stations by interpolating along every train that calls there and taking the median
 * estimate. Repeats so stations next to freshly filled ones can resolve too. Mutates `coords` and
 * returns the codes that were filled.
 */
export function fillByInterpolation(coords: Map<string, LatLon>, routes: GeoStop[][], wanted: Iterable<string>, passes = 3): Set<string> {
  const filled = new Set<string>();
  const missing = new Set([...wanted].filter((c) => !coords.has(c)));
  for (let pass = 0; pass < passes && missing.size > 0; pass++) {
    const estimates = new Map<string, LatLon[]>();
    for (const stops of routes) {
      stops.forEach((s, i) => {
        if (!missing.has(s.code)) return;
        const e = interpolateAt(stops, i, coords);
        if (e) (estimates.get(s.code) ?? estimates.set(s.code, []).get(s.code)!).push(e);
      });
    }
    if (estimates.size === 0) break;
    for (const [code, es] of estimates) {
      coords.set(code, [median(es.map((e) => e[0])), median(es.map((e) => e[1]))]);
      missing.delete(code);
      filled.add(code);
    }
  }
  return filled;
}
