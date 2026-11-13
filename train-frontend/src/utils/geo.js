export const INDIA_CENTER = [22.6, 80.5];

let coordsPromise = null;

export function loadCoords() {
  if (!coordsPromise) {
    coordsPromise = fetch('/station-coords.json')
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => {
        coordsPromise = null;
        return {};
      });
  }
  return coordsPromise;
}

export function boundsOf(points) {
  if (!points || points.length === 0) return null;
  const valid = points.filter((p) => p && typeof p[0] === 'number' && typeof p[1] === 'number');
  if (valid.length === 0) return null;

  let minLat = valid[0][0];
  let maxLat = valid[0][0];
  let minLon = valid[0][1];
  let maxLon = valid[0][1];

  for (const [lat, lon] of valid) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}

export function curvedSegment(p1, p2, curveFactor = 0.05, steps = 10) {
  if (!p1 || !p2) return [];
  if (p1[0] === p2[0] && p1[1] === p2[1]) return [p1];

  const midLat = (p1[0] + p2[0]) / 2;
  const midLon = (p1[1] + p2[1]) / 2;

  // Perpendicular offset
  const dLat = p2[0] - p1[0];
  const dLon = p2[1] - p1[1];
  const ctrlLat = midLat + dLon * curveFactor;
  const ctrlLon = midLon - dLat * curveFactor;

  const points = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const invT = 1 - t;
    const lat = invT * invT * p1[0] + 2 * invT * t * ctrlLat + t * t * p2[0];
    const lon = invT * invT * p1[1] + 2 * invT * t * ctrlLon + t * t * p2[1];
    points.push([lat, lon]);
  }
  return points;
}

export function journeyPaths(journey, coords) {
  if (!journey || !journey.legs || !coords) return [];

  return journey.legs.map((leg) => {
    const fromCoord = coords[leg.from];
    const toCoord = coords[leg.to];
    if (!fromCoord || !toCoord) return [];
    return curvedSegment(fromCoord, toCoord);
  }).filter((line) => line.length > 0);
}
