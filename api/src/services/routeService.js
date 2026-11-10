import { applyFilters } from "./filters.js";
import { formatDatetime } from "./journeyRenderer.js";

export const NO_ROUTE_MESSAGE = "No valid journey found for the specified date and time.";

export class RouteService {
  constructor(engine, stations, renderer, maxResults = 50) {
    this.engine = engine;
    this.stations = stations;
    this.renderer = renderer;
    this.maxResults = maxResults;
  }

  async search(q) {
    const t0 = performance.now();
    const result = await this.engine.route({
      source: q.source,
      destination: q.destination,
      date: q.date,
      time: q.time,
      limit: this.maxResults,
    });

    this.renderer.check(result.timetable);

    const journeys = result.journeys || [];
    const ranked = journeys.map((j, i) => ({
      j,
      rank: i + 1,
      duration_minutes: j.arr - j.dep,
      transfer_count: j.transfers,
    }));

    const { routes: filtered, applied } = applyFilters(ranked, q.filters);
    const start = (q.page - 1) * q.limit;
    const pageRoutes = filtered.slice(start, start + q.limit).map((r) =>
      this.renderer.render(r.j, r.rank, result.search_minute)
    );

    const src = this.stations.get(q.source);
    const dst = this.stations.get(q.destination);

    return {
      query: {
        source: q.source,
        destination: q.destination,
        source_name: src ? src.name : q.source,
        destination_name: dst ? dst.name : q.destination,
        date: q.date,
        time: q.time,
        search_datetime: formatDatetime(result.search_minute),
      },
      routes: pageRoutes.map((r) => shapeRoute(r)),
      ...(filtered.length === 0
        ? { message: journeys.length === 0 ? NO_ROUTE_MESSAGE : "No journey matches the selected filters." }
        : {}),
      filters_applied: applied,
      pagination: {
        page: q.page,
        limit: q.limit,
        returned: pageRoutes.length,
        total_available: filtered.length,
        total_unfiltered: journeys.length,
        total_pages: Math.max(1, Math.ceil(filtered.length / q.limit)),
        max_results: this.maxResults,
      },
      meta: {
        cached: false,
        search_complete: result.search_complete ?? true,
        engine_ms: typeof result.stats?.total_ms === "number" ? Math.round(result.stats.total_ms * 100) / 100 : null,
        api_ms: Math.round((performance.now() - t0) * 100) / 100,
        worker: result.worker || null,
      },
    };
  }
}

function shapeRoute(r) {
  return {
    rank: r.rank,
    id: r.signature,
    source: r.segments[0].from_station,
    destination: r.segments[r.segments.length - 1].to_station,
    departure_datetime: r.departure_datetime,
    arrival_datetime: r.arrival_datetime,
    duration_minutes: r.duration_minutes,
    total_elapsed_duration_minutes: r.elapsed_from_search_minutes,
    initial_wait_minutes: r.initial_wait_minutes,
    train_travel_minutes: r.train_travel_minutes,
    waiting_minutes: r.waiting_minutes,
    transfer_count: r.transfer_count,
    segment_count: r.segment_count,
    is_direct: r.is_direct,
    distance_km: r.distance_km,
    train_numbers: r.segments.map((s) => s.train_number),
    segments: r.segments,
    transfers: r.transfers,
  };
}
