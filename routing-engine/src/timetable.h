// Immutable, query-independent timetable loaded once at startup.
#pragma once

#include <bits/stdc++.h>

typedef long long ll;
typedef unsigned long long ull;

using namespace std;

namespace rail {

const ll kNoTime = -1;
const ll kNoStation = -1;

struct Station {
  string code;
  string name;
};


struct Stop {
  ll station;           // index into Timetable::stations, or kNoStation for a non-boardable point
  ll arr;               // kNoTime at the origin
  ll dep;               // kNoTime at the terminus
  float distance_km;
};

struct Train {
  string number;
  string name;
  string type;
  int days_mask;        // bit w set => a service starts on weekday w (0 = Sunday)
  ll first_stop;        // offset into Timetable::stops
  ll num_stops;
  vector<string> placeholder_names;  // names for kNoStation stops, in order
};

struct DepartureEvent {
  ll tod;               // departure time of day, 0..1439
  ll day_offset;        // (dep / 1440): how many days after the train's start date it departs
  ll train;
  ll stop;              // stop index within the train
};

struct Timetable {
  vector<Station> stations;
  vector<Train> trains;
  vector<Stop> stops;
  vector<vector<DepartureEvent>> departures;
  unordered_map<string, ll> station_by_code;
  vector<pair<ll, ll>> station_index;
  vector<ll> station_index_end;  // per train: end offset into station_index
  ll max_span_days = 1;          // max over trains of ceil(last arrival / 1440)
  ll connection_count = 0;       // elementary stop-to-stop hops per service day pattern
  // FNV-1a 64 of the source file bytes, as 16 lowercase hex digits.
  string hash;

  const Stop& stop(const Train& t, ll i) const {
    return stops[t.first_stop + i];
  }

  // True if train `t` calls at `station` at a stop index in [lo, hi].
  bool train_calls_at(ll t, ll station, ll lo, ll hi) const;
  ll find_station(string_view code) const;

  // Build derived indexes (departures, spans). Called by loaders after stations/trains/stops are set.
  void finalize();
};

Timetable load_timetable_json(string path);

// FNV-1a 64 of `bytes`, as 16 lowercase hex digits.
string fnv1a64_hex(string_view bytes);

Timetable parse_timetable_json(string text);

}  // namespace rail
