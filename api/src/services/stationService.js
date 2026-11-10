import { readFile } from "node:fs/promises";

export class StationService {
  constructor(stations = [], source = "memory") {
    this.stations = [];
    this.byCode = new Map();
    this.source = source;
    if (stations.length) this.load(stations, source);
  }

  load(stations, source = "memory") {
    this.stations = stations;
    this.byCode = new Map(stations.map((s) => [s.code.toUpperCase(), s]));
    this.source = source;
  }

  get size() {
    return this.stations.length;
  }

  all() {
    return this.stations;
  }

  get(code) {
    if (!code) return undefined;
    return this.byCode.get(String(code).trim().toUpperCase());
  }

  static hit(s) {
    return {
      code: s.code,
      name: s.name,
      label: `${s.name} (${s.code})`,
      train_count: s.train_count || 0,
    };
  }

  search(query, limit = 10) {
    const q = String(query || "").trim().toUpperCase();
    if (!q) return [];

    const matches = [];
    for (const s of this.stations) {
      const code = s.code.toUpperCase();
      const name = (s.name || "").toUpperCase();
      const aliases = (s.all_known_names || []).map((n) => n.toUpperCase());

      let tier = -1;
      if (code === q) {
        tier = 0; // exact code match
      } else if (code.startsWith(q)) {
        tier = 1; // code prefix match
      } else if (name.startsWith(q) || aliases.some((a) => a.startsWith(q))) {
        tier = 2; // name prefix match
      } else if (name.includes(q) || aliases.some((a) => a.includes(q))) {
        tier = 3; // substring match
      }

      if (tier !== -1) {
        matches.push({ s, tier });
      }
    }

    matches.sort((a, b) => a.tier - b.tier || (b.s.train_count || 0) - (a.s.train_count || 0) || (a.s.code < b.s.code ? -1 : 1));
    return matches.slice(0, limit).map((m) => StationService.hit(m.s));
  }
}

export async function loadStationsFromFile(path) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
}
