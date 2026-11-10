import { readFileSync } from "node:fs";

const NO_TIME = -1;

// fnv-1a 64 hash to verify timetable alignment with routing engine.
export function fnv1a64Hex(bytes) {
  let hi = 0xcbf29ce4;
  let lo = 0x84222325;
  for (let i = 0; i < bytes.length; i++) {
    lo = (lo ^ bytes[i]) >>> 0;
    const l = lo * 0x1b3;
    const h = hi * 0x1b3 + Math.floor(l / 0x100000000) + ((lo << 8) >>> 0);
    lo = l >>> 0;
    hi = h >>> 0;
  }
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}

export function formatDatetime(absMin) {
  return new Date(absMin * 60_000).toISOString().slice(0, 16) + ":00";
}

export function formatDate(day) {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

export class JourneyRenderer {
  constructor(bytes) {
    this.hash = fnv1a64Hex(bytes);
    const doc = JSON.parse(new TextDecoder().decode(bytes));
    if (doc.format !== "railway-timetable/v1") {
      throw new Error("unsupported timetable format");
    }

    this.codes = doc.stations.map((s) => s.code);
    this.names = doc.stations.map((s) => s.name);
    this.trains = [];

    for (const t of doc.trains) {
      if ((t.days & 0x7f) === 0) continue; // train never runs
      this.trains.push({
        number: t.number,
        name: t.name || t.number,
        type: t.type || "UNKNOWN",
        stops: t.stops.map((r) => ({
          station: r[0],
          arr: r[1],
          dep: r[2],
          km: Math.fround(r[3]),
          placeholder: r[0] === -1 ? (r[4] || "UNNAMED POINT") : null,
        })),
      });
    }
  }

  static fromFile(path) {
    return new JourneyRenderer(readFileSync(path));
  }

  check(timetable) {
    if (timetable && timetable !== this.hash) {
      throw new Error(`timetable mismatch: engine ${timetable}, API ${this.hash}`);
    }
  }

  station(tr, i) {
    const s = tr.stops[i];
    return s.station === -1
      ? { code: null, name: s.placeholder }
      : { code: this.codes[s.station], name: this.names[s.station] };
  }

  render(j, rank, searchMinute) {
    const segments = [];
    const transfers = [];
    let totalKm = 0;

    j.legs.forEach(([train, board, alight, startDay], li) => {
      const tr = this.trains[train];
      if (!tr || board >= alight || alight >= tr.stops.length) {
        throw new Error(`leg does not match timetable: ${j.signature}`);
      }

      const base = startDay * 1440;
      const b = tr.stops[board];
      const a = tr.stops[alight];
      const stops = [];

      for (let k = board; k <= alight; k++) {
        const s = tr.stops[k];
        stops.push({
          ...this.station(tr, k),
          arrival_datetime: k === board || s.arr === NO_TIME ? null : formatDatetime(base + s.arr),
          departure_datetime: k === alight || s.dep === NO_TIME ? null : formatDatetime(base + s.dep),
          distance_km: Math.fround(s.km - b.km),
          boardable: s.station !== -1,
        });
      }

      const dep = base + b.dep;
      const arr = base + a.arr;
      const km = Math.fround(a.km - b.km);
      totalKm += km;

      segments.push({
        train_number: tr.number,
        train_name: tr.name,
        train_type: tr.type,
        train_start_date: formatDate(startDay),
        from_station: this.station(tr, board),
        to_station: this.station(tr, alight),
        departure_datetime: formatDatetime(dep),
        arrival_datetime: formatDatetime(arr),
        duration_minutes: arr - dep,
        distance_km: km,
        stop_count: alight - board,
        stops,
      });

      const next = j.legs[li + 1];
      if (next) {
        const nextDep = next[3] * 1440 + this.trains[next[0]].stops[next[1]].dep;
        transfers.push({
          station: this.station(tr, alight),
          arrival_datetime: formatDatetime(arr),
          departure_datetime: formatDatetime(nextDep),
          wait_minutes: nextDep - arr,
        });
      }
    });

    return {
      rank,
      signature: j.signature,
      departure_datetime: formatDatetime(j.dep),
      arrival_datetime: formatDatetime(j.arr),
      duration_minutes: j.arr - j.dep,
      elapsed_from_search_minutes: j.arr - searchMinute,
      initial_wait_minutes: j.dep - searchMinute,
      train_travel_minutes: j.train_minutes,
      waiting_minutes: j.waiting_minutes,
      transfer_count: j.transfers,
      segment_count: j.legs.length,
      is_direct: j.transfers === 0,
      distance_km: totalKm,
      segments,
      transfers,
    };
  }
}
