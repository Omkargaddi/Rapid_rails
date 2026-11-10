export interface StationRef {
  code: string | null;
  name: string;
}

export interface StationHit {
  code: string;
  name: string;
  label: string;
  train_count: number;
}

export interface Stop extends StationRef {
  arrival_datetime: string | null;
  departure_datetime: string | null;
  distance_km: number;
  boardable: boolean;
}

export interface Segment {
  train_number: string;
  train_name: string;
  train_type: string;
  train_start_date: string;
  from_station: StationRef;
  to_station: StationRef;
  departure_datetime: string;
  arrival_datetime: string;
  duration_minutes: number;
  distance_km: number;
  stop_count: number;
  stops: Stop[];
}

export interface Transfer {
  station: StationRef;
  arrival_datetime: string;
  departure_datetime: string;
  wait_minutes: number;
}

export interface Journey {
  rank: number;
  id: string;
  source: StationRef;
  destination: StationRef;
  departure_datetime: string;
  arrival_datetime: string;
  duration_minutes: number;
  total_elapsed_duration_minutes: number;
  initial_wait_minutes: number;
  train_travel_minutes: number;
  waiting_minutes: number;
  transfer_count: number;
  segment_count: number;
  is_direct: boolean;
  distance_km: number;
  train_numbers: string[];
  segments: Segment[];
  transfers: Transfer[];
}

export interface RouteResponse {
  query: {
    source: string;
    destination: string;
    source_name: string;
    destination_name: string;
    date: string;
    time: string;
    search_datetime: string;
  };
  routes: Journey[];
  message?: string;
  pagination: { page: number; limit: number; returned: number; total_available: number; total_pages: number; max_results: number };
  meta: { cached: boolean; search_complete: boolean; engine_ms: number | null; api_ms: number };
}

export interface ApiError {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}
