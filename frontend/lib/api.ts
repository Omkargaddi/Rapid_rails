import type { ApiError, RouteResponse, StationHit } from "./types";

/** Journeys fetched per search; must not exceed the API's MAX_RESULTS. */
export const MAX_RESULTS = 50;

export class RequestError extends Error {
  status: number;
  details?: { field: string; message: string }[];
  constructor(message: string, status: number, details?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body as ApiError | null;
    throw new RequestError(err?.error?.message ?? `Request failed (${res.status})`, res.status, err?.error?.details);
  }
  return body as T;
}

export async function searchStations(q: string, signal?: AbortSignal): Promise<StationHit[]> {
  const res = await fetch(`/api/stations?q=${encodeURIComponent(q)}&limit=8`, { signal });
  return (await parse<{ stations: StationHit[] }>(res)).stations;
}

export async function searchRoutes(input: { source: string; destination: string; date: string; time: string }): Promise<RouteResponse> {
  const res = await fetch("/api/routes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, limit: MAX_RESULTS, page: 1 }),
  });
  return parse<RouteResponse>(res);
}
