#include <bits/stdc++.h>
#include "router.h"
#include "civil_time.h"
typedef long long ll;
typedef unsigned long long ull;
using namespace std;

namespace rail {
namespace {

using Clock = chrono::steady_clock;
using detail::WeekPattern;

typedef ll Lex;
ll kTrBits = 8;
ll kTrMask = (1LL << kTrBits) - 1;
ll INF = 2000000000000LL;
ll LEX_INF = 4000000000000000000LL;

double ms_since(Clock::time_point t) {
  return chrono::duration<double, milli>(Clock::now() - t).count();
}

inline Lex make_lex(ll arr, ll tr) {
  ll clamped_tr = tr;
  if (clamped_tr > kTrMask) {
    clamped_tr = kTrMask;
  }
  return (arr << kTrBits) | clamped_tr;
}

inline ll lex_arr(Lex v) {
  if (v == LEX_INF) {
    return INF;
  } else {
    return v >> kTrBits;
  }
}

inline ll lex_tr(Lex v) {
  return v & kTrMask;
}

inline Lex plus_transfer(Lex v) {
  if (v == LEX_INF) {
    return v;
  }
  if ((v & kTrMask) == kTrMask) {
    return v;
  }
  return v + 1;
}

enum Kind { kRoot = 0, kOnboard = 1, kAtStation = 2 };

struct Label {
  ll parent = -1;
  ll inst = 0;
  ll stop = 0;
  ll kind = kRoot;
  ll transfers = 0;
  ll just_boarded = 0;
  ll station = 0;
  ll time = 0;
  ll first_dep = 0;
  ll wait = 0;
  ll ceiling = 0;
  ll board_stop = 0;
  ull bloom = 0;
};

struct QueueKey {
  ll arr_lb;
  ll neg_first_dep;
  ll tr_lb;
  ll wait;
  ll label;

  bool operator>(const QueueKey& o) const {
    if (arr_lb != o.arr_lb) {
      return arr_lb > o.arr_lb;
    }
    if (neg_first_dep != o.neg_first_dep) {
      return neg_first_dep > o.neg_first_dep;
    }
    if (tr_lb != o.tr_lb) {
      return tr_lb > o.tr_lb;
    }
    if (wait != o.wait) {
      return wait > o.wait;
    }
    return label > o.label;
  }
};

inline ull bloom_bit(ll station) {
  ull x = (ull)station * 0x9E3779B97F4A7C15ull;
  return 1ull << (x >> 58);
}

struct Workspace {
  vector<Lex> val;
  vector<ll> board_count;
  vector<ll> alight_count;
  vector<Lex> trip_best;
  vector<vector<pair<ll, Lex>>> profile;
  vector<Label> labels;
  vector<ll> station_mark;
  vector<ll> train_mark;
  ll epoch = 0;
};

Workspace& workspace() {
  thread_local Workspace ws;
  return ws;
}

inline Lex profile_eval(vector<pair<ll, Lex>>& p, ll t) {
  ll lo = 0;
  ll hi = (ll)p.size();
  while (lo < hi) {
    ll mid = (lo + hi) / 2;
    if (p[mid].first >= t) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  if (lo == 0) {
    return LEX_INF;
  } else {
    return p[lo - 1].second;
  }
}

bool compare_connections(const WeekPattern::Connection& a, const WeekPattern::Connection& b) {
  if (a.dep_rel != b.dep_rel) {
    return a.dep_rel > b.dep_rel;
  }
  if (a.inst != b.inst) {
    return a.inst < b.inst;
  }
  return a.stop > b.stop;
}

bool compare_departure_tod(const DepartureEvent& e, ll v) {
  return e.tod < v;
}

void collect_stations(const Timetable& tt, Leg& l, ll from, ll to, vector<ll>& out) {
  Train tr = tt.trains[l.train];
  for (ll k = from; k <= to; ++k) {
    ll st = tt.stop(tr, k).station;
    if (st != kNoStation) {
      out.push_back(st);
    }
  }
}

void push_label(Workspace& ws, priority_queue<QueueKey, vector<QueueKey>, greater<QueueKey>>& pq, RouteResult& res, Label l, ll arr_lb, ll tr_lb) {
  ws.labels.push_back(l);
  ll idx = (ll)ws.labels.size() - 1;
  ll neg_dep = -INF;
  if (l.first_dep != INF) {
    neg_dep = -l.first_dep;
  }
  pq.push({arr_lb, neg_dep, tr_lb, l.wait, idx});
  res.stats.labels_created = res.stats.labels_created + 1;
}

bool chain_has_station(const Timetable& tt, Workspace& ws, const WeekPattern& P, Label& l, ll station) {
  if (!(l.bloom & bloom_bit(station))) {
    return false;
  }
  if (tt.train_calls_at(P.instances[l.inst].train, station, l.board_stop, l.stop)) {
    return true;
  }
  for (ll x = l.parent; x >= 0; x = ws.labels[x].parent) {
    Label& c = ws.labels[x];
    if (c.kind == kRoot) {
      return c.station == station;
    }
    if (tt.train_calls_at(P.instances[c.inst].train, station, c.board_stop, c.stop)) {
      return true;
    }
  }
  return false;
}

RouteResult make_invalid_result(const char* msg) {
  RouteResult res;
  res.status = RouteStatus::InvalidQuery;
  res.error = msg;
  return res;
}

WeekPattern build_pattern(const Timetable& tt, ll query_weekday, ll horizon) {
  WeekPattern p;
  p.day_lo = -tt.max_span_days;
  ll day_hi = (1439 + horizon) / 1440;
  p.ndays = day_hi - p.day_lo + 1;
  p.inst_of.assign(tt.trains.size() * (size_t)p.ndays, -1);

  for (ll t = 0; t < (ll)tt.trains.size(); ++t) {
    Train tr = tt.trains[t];
    ll last_arr = tt.stop(tr, tr.num_stops - 1).arr;
    for (ll off = p.day_lo; off <= day_hi; ++off) {
      ll wd = ((query_weekday + off) % 7 + 7) % 7;
      if (!((tr.days_mask >> wd) & 1)) {
        continue;
      }
      if (off * 1440 + last_arr < 0) {
        continue;
      }
      p.inst_of[t * (size_t)p.ndays + (off - p.day_lo)] = (ll)p.instances.size();
      p.instances.push_back({t, off * 1440, p.instance_stops});
      p.instance_stops = p.instance_stops + tr.num_stops;
    }
  }

  for (ll i = 0; i < (ll)p.instances.size(); ++i) {
    auto in = p.instances[i];
    Train tr = tt.trains[in.train];
    for (ll k = 0; k + 1 < tr.num_stops; ++k) {
      ll dep = in.rel_base + tt.stop(tr, k).dep;
      if (dep < 0) {
        continue;
      }
      ll arr = in.rel_base + tt.stop(tr, k + 1).arr;
      p.connections.push_back({dep, arr, i, k});
    }
  }

  sort(p.connections.begin(), p.connections.end(), compare_connections);
  return p;
}

bool boards_train_late(const Timetable& tt, Journey& J, ll src, ll S, ll first_leg_last_dep, ll TR) {
  ll n = (ll)J.legs.size();
  if (n < 2) {
    return false;
  }

  for (ll li = 1; li < n; ++li) {
    Leg leg = J.legs[li];
    Train tr = tt.trains[leg.train];
    ll base = leg.start_day * 1440;

    vector<ll> rest;
    for (ll r = li; r < n; ++r) {
      ll from_idx = leg.board_stop;
      if (r > li) {
        from_idx = J.legs[r].board_stop + 1;
      } else {
        from_idx = J.legs[r].board_stop;
      }
      collect_stations(tt, J.legs[r], from_idx, J.legs[r].alight_stop, rest);
    }

    vector<ll> prefix;
    prefix.push_back(src);

    for (ll m = 0; m < li; ++m) {
      ll p_station = 0;
      if (m == 0) {
        p_station = src;
      } else {
        Leg prev_leg = J.legs[m - 1];
        p_station = tt.stop(tt.trains[prev_leg.train], prev_leg.alight_stop).station;
      }

      ll lo = 0;
      ll hi = 0;
      if (m == 0) {
        lo = S;
        if (J.departure > lo) {
          lo = J.departure;
        }
        hi = first_leg_last_dep;
      } else {
        lo = J.legs[m - 1].arr + TR;
        hi = INF;
      }

      if (m > 0) {
        collect_stations(tt, J.legs[m - 1], J.legs[m - 1].board_stop + 1, J.legs[m - 1].alight_stop, prefix);
      }

      for (ll jst = 0; jst < leg.board_stop; ++jst) {
        Stop sj = tt.stop(tr, jst);
        if (sj.station != p_station) {
          continue;
        }
        ll dj = base + sj.dep;
        if (dj < lo || dj > hi) {
          continue;
        }

        vector<ll> all = prefix;
        all.pop_back();  // p_station will be added below
        collect_stations(tt, leg, jst, leg.board_stop - 1, all);
        all.insert(all.end(), rest.begin(), rest.end());

        sort(all.begin(), all.end());
        bool duplicate_found = false;
        for (ll idx = 0; idx + 1 < (ll)all.size(); ++idx) {
          if (all[idx] == all[idx + 1]) {
            duplicate_found = true;
            break;
          }
        }
        if (!duplicate_found) {
          return true;
        }
      }
    }
  }
  return false;
}

bool leaves_train_early(const Timetable& tt, Journey& J) {
  ll n = (ll)J.legs.size();
  for (ll li = 0; li + 1 < n; ++li) {
    Leg leg = J.legs[li];
    Train t1 = tt.trains[leg.train];
    ll base = leg.start_day * 1440;

    for (ll m = li + 1; m < n; ++m) {
      Leg lm = J.legs[m];
      ll z_station = tt.stop(tt.trains[lm.train], lm.alight_stop).station;

      for (ll z = leg.alight_stop + 1; z < t1.num_stops; ++z) {
        if (tt.stop(t1, z).station != z_station) {
          continue;
        }
        if (base + tt.stop(t1, z).arr > lm.arr) {
          break;
        }

        vector<ll> all;
        for (ll r = 0; r <= li; ++r) {
          Train tr = tt.trains[J.legs[r].train];
          ll k_start = J.legs[r].board_stop;
          if (r > 0) {
            k_start = k_start + 1;
          }
          ll k_end = J.legs[r].alight_stop;
          if (r == li) {
            k_end = z;
          }
          for (ll k = k_start; k <= k_end; ++k) {
            ll st = tt.stop(tr, k).station;
            if (st != kNoStation) {
              all.push_back(st);
            }
          }
        }

        for (ll r = m + 1; r < n; ++r) {
          Train tr = tt.trains[J.legs[r].train];
          ll k_start = J.legs[r].board_stop + 1;
          ll k_end = J.legs[r].alight_stop;
          for (ll k = k_start; k <= k_end; ++k) {
            ll st = tt.stop(tr, k).station;
            if (st != kNoStation) {
              all.push_back(st);
            }
          }
        }

        sort(all.begin(), all.end());
        bool duplicate_found = false;
        for (ll idx = 0; idx + 1 < (ll)all.size(); ++idx) {
          if (all[idx] == all[idx + 1]) {
            duplicate_found = true;
            break;
          }
        }
        if (!duplicate_found) {
          return true;
        }
        break;
      }
    }
  }
  return false;
}

}  // namespace

Router::Router(const Timetable& tt, RouterConfig cfg) : tt_(tt), cfg_(cfg) {
  if (cfg_.min_transfer_minutes < 1) {
    cfg_.min_transfer_minutes = 1;
  }
  if (cfg_.max_transfers < 0) {
    cfg_.max_transfers = 0;
  } else if (cfg_.max_transfers > 250) {
    cfg_.max_transfers = 250;
  }

  if (cfg_.top_k < 1) {
    cfg_.top_k = 1;
  }

  if (cfg_.k_node < 0) {
    cfg_.k_node = 0;
  } else if (cfg_.k_node > 65535) {
    cfg_.k_node = 65535;
  }

  if (cfg_.horizon_minutes < 60) {
    cfg_.horizon_minutes = 60;
  } else if (cfg_.horizon_minutes > 30 * 1440) {
    cfg_.horizon_minutes = 30 * 1440;
  }

  patterns_.reserve(7);
  for (ll w = 0; w < 7; ++w) {
    patterns_.push_back(build_pattern(tt_, w, cfg_.horizon_minutes));
  }
}

RouteResult Router::route(Query q) const {
  auto t_start = Clock::now();
  RouteResult res;
  ll nst = (ll)tt_.stations.size();

  if (q.source < 0 || q.source >= nst || q.destination < 0 || q.destination >= nst) {
    return make_invalid_result("unknown station");
  }
  if (q.source == q.destination) {
    return make_invalid_result("source and destination must differ");
  }
  if (q.time_minute < 0 || q.time_minute >= 1440) {
    return make_invalid_result("time out of range");
  }
  if (q.date_day < 0 || q.date_day > 200000) {
    return make_invalid_result("date out of range");
  }

  ll K = cfg_.top_k;
  if (q.limit > 0) {
    if (q.limit < cfg_.top_k) {
      K = q.limit;
    }
  }

  ll TR = cfg_.min_transfer_minutes;
  ll qbase = q.date_day * 1440;
  ll S = qbase + q.time_minute;
  ll first_leg_last_dep = qbase + 1439;
  ll E = S + cfg_.horizon_minutes;
  ll src = q.source;
  ll dst = q.destination;
  WeekPattern& P = const_cast<WeekPattern&>(patterns_[weekday(q.date_day)]);

  Workspace& ws = workspace();
  ws.val.assign(P.instance_stops, LEX_INF);
  ws.board_count.assign(P.instance_stops, 0);
  ws.alight_count.assign(P.instance_stops, 0);
  ws.trip_best.assign(P.instances.size(), LEX_INF);

  if ((ll)ws.profile.size() != nst) {
    ws.profile.assign(nst, {});
  }
  for (ll i = 0; i < nst; ++i) {
    ws.profile[i].clear();
  }

  res.stats.instances = P.instances.size();
  res.stats.setup_ms = ms_since(t_start);

  // ---- 1. backward profile scan ---------------------------------------------------------------
  auto t_profile = Clock::now();
  ll t_rel = q.time_minute;
  ll e_rel = q.time_minute + cfg_.horizon_minutes;

  for (auto& c : P.connections) {
    if (c.dep_rel < t_rel) {
      break;
    }
    if (c.arr_rel > e_rel) {
      continue;
    }
    res.stats.connections = res.stats.connections + 1;

    auto in = P.instances[c.inst];
    Train tr = tt_.trains[in.train];
    ll arr = qbase + c.arr_rel;
    ll to = tt_.stop(tr, c.stop + 1).station;

    Lex best = ws.trip_best[c.inst];
    if (to == dst) {
      Lex dst_bound = make_lex(arr, 0);
      if (dst_bound < best) {
        best = dst_bound;
      }
    } else if (to != kNoStation) {
      Lex change_bound = plus_transfer(profile_eval(ws.profile[to], arr + TR));
      if (change_bound < best) {
        best = change_bound;
      }
    }

    ws.val[in.offset + c.stop + 1] = best;
    ws.trip_best[c.inst] = best;

    ll from = tt_.stop(tr, c.stop).station;
    if (best != LEX_INF && from != kNoStation) {
      auto& p = ws.profile[from];
      if (p.empty() || best < p.back().second) {
        p.push_back({qbase + c.dep_rel, best});
      }
    }
  }
  res.stats.profile_ms = ms_since(t_profile);

  // ---- 2. best-first K-best enumeration ---------------------------------------------------------
  auto t_search = Clock::now();
  ws.labels.clear();
  priority_queue<QueueKey, vector<QueueKey>, greater<QueueKey>> pq;

  if ((ll)ws.station_mark.size() != nst) {
    ws.station_mark.assign(nst, 0);
  }
  if ((ll)ws.train_mark.size() != (ll)tt_.trains.size()) {
    ws.train_mark.assign(tt_.trains.size(), 0);
  }

  bool stay_on = cfg_.prune_stay_on;
  bool board_earlier = cfg_.prune_board_earlier;
  ll cap = cfg_.k_node;

  Label root_lbl;
  root_lbl.parent = -1;
  root_lbl.inst = 0;
  root_lbl.stop = 0;
  root_lbl.kind = kRoot;
  root_lbl.transfers = 0;
  root_lbl.just_boarded = 0;
  root_lbl.station = src;
  root_lbl.time = S;
  root_lbl.first_dep = INF;
  root_lbl.wait = 0;
  root_lbl.ceiling = INF;
  root_lbl.board_stop = 0;
  root_lbl.bloom = bloom_bit(src);
  push_label(ws, pq, res, root_lbl, 0, 0);

  unordered_set<string> seen_signatures;

  while (!pq.empty()) {
    if ((ll)ws.labels.size() >= cfg_.max_labels) {
      res.stats.truncated = true;
      break;
    }
    QueueKey top = pq.top();
    pq.pop();
    res.stats.labels_popped = res.stats.labels_popped + 1;
    Label L = ws.labels[top.label];

    if (L.kind == kOnboard && L.just_boarded && cap > 0) {
      ll& c = ws.board_count[P.instances[L.inst].offset + L.stop - 1];
      if (c >= cap) {
        res.stats.pruned_by_cap = res.stats.pruned_by_cap + 1;
        continue;
      }
      c = c + 1;
    }

    if (L.kind == kAtStation && L.station == dst) {
      Journey j;
      for (ll x = top.label; x >= 0 && ws.labels[x].kind == kAtStation; x = ws.labels[x].parent) {
        Label& c = ws.labels[x];
        auto& in = P.instances[c.inst];
        Train tr = tt_.trains[in.train];
        Leg leg;
        leg.train = in.train;
        leg.start_day = q.date_day + in.rel_base / 1440;
        leg.board_stop = c.board_stop;
        leg.alight_stop = c.stop;
        leg.dep = qbase + in.rel_base + tt_.stop(tr, c.board_stop).dep;
        leg.arr = c.time;
        j.legs.push_back(leg);
      }
      reverse(j.legs.begin(), j.legs.end());
      j.departure = j.legs.front().dep;
      j.arrival = j.legs.back().arr;
      j.transfers = (ll)j.legs.size() - 1;
      j.waiting_minutes = L.wait;
      j.train_minutes = 0;

      for (Leg& leg : j.legs) {
        j.train_minutes = j.train_minutes + (leg.arr - leg.dep);
        Train tr = tt_.trains[leg.train];
        j.signature += tr.number + ":" + tt_.stations[tt_.stop(tr, leg.board_stop).station].code + ">" +
                       tt_.stations[tt_.stop(tr, leg.alight_stop).station].code + "|";
      }

      bool dominated = false;
      if (board_earlier && boards_train_late(tt_, j, src, S, first_leg_last_dep, TR)) {
        dominated = true;
      }
      if (stay_on && leaves_train_early(tt_, j)) {
        dominated = true;
      }
      if (dominated) {
        res.stats.pruned_by_dominance = res.stats.pruned_by_dominance + 1;
        continue;
      }

      if (seen_signatures.find(j.signature) != seen_signatures.end()) {
        res.stats.duplicate_signatures = res.stats.duplicate_signatures + 1;
        continue;
      }
      seen_signatures.insert(j.signature);

      res.journeys.push_back(std::move(j));
      if ((ll)res.journeys.size() >= K) {
        break;
      }
      continue;
    }

    if (L.kind == kOnboard) {
      auto& in = P.instances[L.inst];
      Train tr = tt_.trains[in.train];
      ll base = qbase + in.rel_base;
      ll st = tt_.stop(tr, L.stop).station;

      // alight here
      if (st != kNoStation && (st == dst || L.transfers < cfg_.max_transfers)) {
        ll arr_lb = 0;
        ll tr_lb = 0;
        if (st == dst) {
          arr_lb = L.time;
          tr_lb = L.transfers;
        } else {
          Lex v = profile_eval(ws.profile[st], L.time + TR);
          arr_lb = lex_arr(v);
          tr_lb = L.transfers + 1 + lex_tr(v);
        }

        ll ceiling = L.ceiling;
        if (stay_on && st != dst) {
          for (ll m = L.stop + 1; m < tr.num_stops; ++m) {
            ll sm = tt_.stop(tr, m).station;
            if (sm == dst) {
              ll dst_arrival = base + tt_.stop(tr, m).arr;
              if (dst_arrival < ceiling) {
                ceiling = dst_arrival;
              }
              break;
            }
            if (sm != kNoStation && chain_has_station(tt_, ws, P, L, sm)) {
              break;
            }
          }
        }

        if (arr_lb >= ceiling) {
          res.stats.pruned_by_dominance = res.stats.pruned_by_dominance + 1;
        } else if (arr_lb <= E) {
          Label next_lbl;
          next_lbl.parent = L.parent;
          next_lbl.inst = L.inst;
          next_lbl.stop = L.stop;
          next_lbl.kind = kAtStation;
          next_lbl.transfers = L.transfers;
          next_lbl.just_boarded = 0;
          next_lbl.station = st;
          next_lbl.time = L.time;
          next_lbl.first_dep = L.first_dep;
          next_lbl.wait = L.wait;
          next_lbl.ceiling = ceiling;
          next_lbl.board_stop = L.board_stop;
          next_lbl.bloom = L.bloom;
          push_label(ws, pq, res, next_lbl, arr_lb, tr_lb);
        }
      }

      // stay on board to the next stop
      if (st != dst && L.stop + 1 < tr.num_stops) {
        ll k = L.stop + 1;
        Lex v = ws.val[in.offset + k];
        ll arr_lb = lex_arr(v);
        ll nxt = tt_.stop(tr, k).station;
        if (arr_lb <= E && arr_lb < L.ceiling) {
          if (nxt == kNoStation || !chain_has_station(tt_, ws, P, L, nxt)) {
            ull next_bloom = L.bloom;
            if (nxt != kNoStation) {
              next_bloom = next_bloom | bloom_bit(nxt);
            }
            Label next_lbl;
            next_lbl.parent = L.parent;
            next_lbl.inst = L.inst;
            next_lbl.stop = k;
            next_lbl.kind = kOnboard;
            next_lbl.transfers = L.transfers;
            next_lbl.just_boarded = 0;
            next_lbl.station = nxt;
            next_lbl.time = base + tt_.stop(tr, k).arr;
            next_lbl.first_dep = L.first_dep;
            next_lbl.wait = L.wait;
            next_lbl.ceiling = L.ceiling;
            next_lbl.board_stop = L.board_stop;
            next_lbl.bloom = next_bloom;
            push_label(ws, pq, res, next_lbl, arr_lb, L.transfers + lex_tr(v));
          }
        }
      }
      continue;
    }

    // Root or AtStation (not destination): board a departing train.
    if (L.kind == kAtStation && cap > 0) {
      ll& c = ws.alight_count[P.instances[L.inst].offset + L.stop];
      if (c >= cap) {
        res.stats.pruned_by_cap = res.stats.pruned_by_cap + 1;
        continue;
      }
      c = c + 1;
    }

    bool is_root = (L.kind == kRoot);
    ll lo = 0;
    if (is_root) {
      lo = S;
    } else {
      lo = L.time + TR;
    }

    ll hi = E;
    if (is_root) {
      if (first_leg_last_dep < hi) {
        hi = first_leg_last_dep;
      }
    }

    ll next_transfers = 0;
    if (is_root) {
      next_transfers = 0;
    } else {
      next_transfers = L.transfers + 1;
    }

    ws.epoch = ws.epoch + 1;
    if (ws.epoch == 0) {
      fill(ws.station_mark.begin(), ws.station_mark.end(), 0);
      fill(ws.train_mark.begin(), ws.train_mark.end(), 0);
      ws.epoch = 1;
    }

    for (ll x = top.label; x >= 0; x = ws.labels[x].parent) {
      Label& c = ws.labels[x];
      if (c.kind == kRoot) {
        ws.station_mark[c.station] = ws.epoch;
        break;
      }
      ll t = P.instances[c.inst].train;
      ws.train_mark[t] = ws.epoch;
      Train tr = tt_.trains[t];
      for (ll k = c.board_stop; k <= c.stop; ++k) {
        ll st = tt_.stop(tr, k).station;
        if (st != kNoStation) {
          ws.station_mark[st] = ws.epoch;
        }
      }
    }

    auto& evs = tt_.departures[L.station];
    if (!evs.empty() && lo <= hi) {
      for (ll D = floor_div(lo, 1440); D <= floor_div(hi, 1440); ++D) {
        ll tod_lo = lo - D * 1440;
        if (tod_lo < 0) {
          tod_lo = 0;
        }
        ll tod_hi = hi - D * 1440;
        if (tod_hi > 1439) {
          tod_hi = 1439;
        }

        auto it = lower_bound(evs.begin(), evs.end(), tod_lo, compare_departure_tod);
        for (; it != evs.end() && it->tod <= tod_hi; ++it) {
          ll off = D - q.date_day - it->day_offset;
          if (off < P.day_lo || off >= P.day_lo + P.ndays) {
            continue;
          }
          ll inst = P.inst_of[it->train * (size_t)P.ndays + (off - P.day_lo)];
          if (inst < 0) {
            continue;
          }
          ll stop = it->stop;
          ll dep = D * 1440 + it->tod;

          auto& in = P.instances[inst];
          if (ws.train_mark[in.train] == ws.epoch) {
            continue;
          }
          Train tr = tt_.trains[in.train];
          ll k = stop + 1;
          Lex v = ws.val[in.offset + k];
          ll arr_lb = lex_arr(v);
          if (arr_lb > E || arr_lb >= L.ceiling) {
            continue;
          }
          ll nxt = tt_.stop(tr, k).station;
          if (nxt != kNoStation && ws.station_mark[nxt] == ws.epoch) {
            continue;
          }

          ll first_dep = 0;
          if (is_root) {
            first_dep = dep;
          } else {
            first_dep = L.first_dep;
          }

          ll wait = 0;
          if (is_root) {
            wait = 0;
          } else {
            wait = L.wait + (dep - L.time);
          }

          ull next_bloom = L.bloom;
          if (nxt != kNoStation) {
            next_bloom = next_bloom | bloom_bit(nxt);
          }

          Label next_lbl;
          next_lbl.parent = top.label;
          next_lbl.inst = inst;
          next_lbl.stop = k;
          next_lbl.kind = kOnboard;
          next_lbl.transfers = next_transfers;
          next_lbl.just_boarded = 1;
          next_lbl.station = nxt;
          next_lbl.time = qbase + in.rel_base + tt_.stop(tr, k).arr;
          next_lbl.first_dep = first_dep;
          next_lbl.wait = wait;
          next_lbl.ceiling = L.ceiling;
          next_lbl.board_stop = stop;
          next_lbl.bloom = next_bloom;
          push_label(ws, pq, res, next_lbl, arr_lb, next_transfers + lex_tr(v));
        }
      }
    }
  }

  res.stats.search_ms = ms_since(t_search);
  res.stats.total_ms = ms_since(t_start);
  if (res.journeys.empty()) {
    res.stats.lower_bound = -1;
    res.status = RouteStatus::NoRoute;
  } else {
    res.stats.lower_bound = res.journeys.front().arrival - S;
    res.status = RouteStatus::Ok;
  }
  return res;
}

}  // namespace rail
