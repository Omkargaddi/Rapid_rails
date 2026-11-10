#include <bits/stdc++.h>

#include "timetable.h"
#include "json.hpp"

typedef long long ll;
typedef unsigned long long ull;

using namespace std;

namespace rail {

bool compare_departure_events(const DepartureEvent& a, const DepartureEvent& b) {
  if (a.tod != b.tod) {
    return a.tod < b.tod;
  }
  if (a.train != b.train) {
    return a.train < b.train;
  }
  return a.stop < b.stop;
}

ll Timetable::find_station(string_view code) const {
  auto it = station_by_code.find(string(code));
  if (it == station_by_code.end()) {
    return kNoStation;
  } else {
    return it->second;
  }
}

bool Timetable::train_calls_at(ll t, ll station, ll lo, ll hi) const {
  ll start_pos = trains[t].first_stop;
  ll end_pos = station_index_end[t];
  for (ll i = start_pos; i < end_pos; ++i) {
    if (station_index[i].first == station) {
      ll stop_idx = station_index[i].second;
      if (stop_idx >= lo && stop_idx <= hi) {
        return true;
      }
    }
  }
  return false;
}

void Timetable::finalize() {
  station_by_code.clear();
  for (ll i = 0; i < (ll)stations.size(); ++i) {
    station_by_code[stations[i].code] = i;
  }

  departures.assign(stations.size(), {});
  max_span_days = 1;
  connection_count = 0;

  for (ll t = 0; t < (ll)trains.size(); ++t) {
    Train& tr = trains[t];
    if (tr.num_stops < 2) {
      throw runtime_error("train " + tr.number + " has fewer than 2 stops");
    }

    ll prev = -1;
    for (ll i = 0; i < tr.num_stops; ++i) {
      Stop& s = stops[tr.first_stop + i];

      if (s.arr != kNoTime) {
        if (s.arr < prev) {
          throw runtime_error("train " + tr.number + " has non-monotone times");
        }
        prev = s.arr;
      }

      if (s.dep != kNoTime) {
        if (s.dep < prev) {
          throw runtime_error("train " + tr.number + " has non-monotone times");
        }
        prev = s.dep;
      }

      if (i + 1 < tr.num_stops) {
        if (s.dep == kNoTime) {
          throw runtime_error("train " + tr.number + " intermediate stop without departure");
        }
        connection_count = connection_count + 1;
        if (s.station != kNoStation) {
          DepartureEvent ev;
          ev.tod = s.dep % 1440;
          ev.day_offset = s.dep / 1440;
          ev.train = t;
          ev.stop = i;
          departures[s.station].push_back(ev);
        }
      } else {
        if (s.arr == kNoTime) {
          throw runtime_error("train " + tr.number + " terminus without arrival");
        }
      }
    }

    ll last_arr = stops[tr.first_stop + tr.num_stops - 1].arr;
    ll span = last_arr / 1440 + 1;
    if (span > max_span_days) {
      max_span_days = span;
    }
  }

  station_index.assign(stops.size(), {kNoStation, 0});
  station_index_end.assign(trains.size(), 0);

  for (ll t = 0; t < (ll)trains.size(); ++t) {
    Train& tr = trains[t];
    ll w = tr.first_stop;
    for (ll i = 0; i < tr.num_stops; ++i) {
      if (stops[tr.first_stop + i].station != kNoStation) {
        station_index[w] = {stops[tr.first_stop + i].station, i};
        w = w + 1;
      }
    }
    sort(station_index.begin() + tr.first_stop, station_index.begin() + w);
    station_index_end[t] = w;
  }

  for (ll s = 0; s < (ll)departures.size(); ++s) {
    sort(departures[s].begin(), departures[s].end(), compare_departure_events);
  }
}

string fnv1a64_hex(string_view bytes) {
  ull h = 0xcbf29ce484222325ull;
  for (unsigned char c : bytes) {
    h = h ^ c;
    h = h * 0x100000001b3ull;
  }
  char buf[17];
  snprintf(buf, sizeof buf, "%016llx", h);
  return string(buf);
}

Timetable parse_timetable_json(string text) {
  using nlohmann::json;
  json doc = json::parse(text);
  if (doc.value("format", "") != "railway-timetable/v1") {
    throw runtime_error("unsupported timetable format");
  }

  Timetable tt;
  for (auto& s : doc.at("stations")) {
    Station st;
    st.code = s.at("code").get<string>();
    st.name = s.at("name").get<string>();
    tt.stations.push_back(st);
  }
  ll nst = (ll)tt.stations.size();

  for (auto& jt : doc.at("trains")) {
    Train tr;
    tr.number = jt.at("number").get<string>();
    tr.name = jt.value("name", tr.number);
    tr.type = jt.value("type", string("UNKNOWN"));
    tr.days_mask = jt.at("days").get<int>() & 0x7f;
    tr.first_stop = (ll)tt.stops.size();

    for (auto& row : jt.at("stops")) {
      Stop s;
      s.station = row.at(0).get<ll>();
      s.arr = row.at(1).get<ll>();
      s.dep = row.at(2).get<ll>();
      s.distance_km = row.at(3).get<float>();

      if (s.station < kNoStation || s.station >= nst) {
        throw runtime_error("bad station index in train " + tr.number);
      }
      if (s.station == kNoStation) {
        string placeholder = "UNNAMED POINT";
        if (row.size() > 4) {
          placeholder = row.at(4).get<string>();
        }
        tr.placeholder_names.push_back(placeholder);
      }
      tt.stops.push_back(s);
    }

    tr.num_stops = (ll)tt.stops.size() - tr.first_stop;
    if (tr.days_mask == 0) {
      continue;  // never runs; nothing to route
    }
    tt.trains.push_back(std::move(tr));
  }

  tt.finalize();
  tt.hash = fnv1a64_hex(text);
  return tt;
}

Timetable load_timetable_json(string path) {
  ifstream in(path, ios::binary);
  if (!in) {
    throw runtime_error("cannot open timetable " + path);
  }
  stringstream ss;
  ss << in.rdbuf();
  return parse_timetable_json(ss.str());
}

}  // namespace rail
