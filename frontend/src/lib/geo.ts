import type { Journey, Segment } from "./types";

export type LatLon = [number, number];
export type Coords = Record<string, LatLon>;

let coordsPromise: Promise<Coords> | null = null;

export function loadCoords(): Promise<Coords> {
  coordsPromise ??= fetch("/station-coords.json")
    .then((r) => (r.ok ? (r.json() as Promise<Coords>) : {}))
    .catch(() => {
      coordsPromise = null;
      return {};
    });
  return coordsPromise;
}

export function segmentPath(seg: Segment, coords: Coords): LatLon[] {
  const out: LatLon[] = [];
  for (const s of seg.stops) {
    const p = s.code ? coords[s.code] : undefined;
    if (p) out.push(p);
  }
  return out;
}

export function journeyPaths(j: Journey, coords: Coords): LatLon[][] {
  return j.segments.map((s) => segmentPath(s, coords));
}

export function boundsOf(points: LatLon[]): [LatLon, LatLon] | null {
  if (points.length === 0) return null;
  let [minLat, minLon] = points[0];
  let [maxLat, maxLon] = points[0];
  for (const [lat, lon] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}

export const INDIA_CENTER: LatLon = [22.6, 80.5];

export function smoothPath(points: LatLon[], steps = 6): LatLon[] {
  const p = points.filter((q, i) => i === 0 || q[0] !== points[i - 1][0] || q[1] !== points[i - 1][1]);
  if (p.length < 3) return p;
  const knot = (a: LatLon, b: LatLon) => Math.max(Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])), 1e-6);
  const lerp = (a: LatLon, b: LatLon, ta: number, tb: number, t: number): LatLon => {
    const w = (t - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  };
  const out: LatLon[] = [p[0]];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = i > 0 ? p[i - 1] : ([2 * p[0][0] - p[1][0], 2 * p[0][1] - p[1][1]] as LatLon);
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = i + 2 < p.length ? p[i + 2] : ([2 * p2[0] - p1[0], 2 * p2[1] - p1[1]] as LatLon);
    const t0 = 0;
    const t1 = t0 + knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    for (let s = 1; s <= steps; s++) {
      const t = t1 + ((t2 - t1) * s) / steps;
      const a1 = lerp(p0, p1, t0, t1, t);
      const a2 = lerp(p1, p2, t1, t2, t);
      const a3 = lerp(p2, p3, t2, t3, t);
      const b1 = lerp(a1, a2, t0, t2, t);
      const b2 = lerp(a2, a3, t1, t3, t);
      out.push(lerp(b1, b2, t1, t2, t));
    }
  }
  return out;
}
