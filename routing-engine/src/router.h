#pragma once
#include <bits/stdc++.h>
#include "timetable.h"
typedef long long ll;
typedef unsigned long long ull;
using namespace std;

namespace rail {

struct RouterConfig {
  ll min_transfer_minutes = 30;
  ll max_transfers = 10;
  ll top_k = 50;
  ll k_node = 0;
  ll horizon_minutes = 5760;
  ll max_labels = 500000;
  bool prune_stay_on = true;
  bool prune_board_earlier = true;
};

struct Query {
  ll source = kNoStation;
  ll destination = kNoStation;
  ll date_day = 0;
  ll time_minute = 0;
  ll limit = 0;
};

struct Leg {
  ll train;
  ll start_day;
  ll board_stop;
  ll alight_stop;
  ll dep;
  ll arr;
};

struct Journey {
  vector<Leg> legs;
  ll departure;
  ll arrival;
  ll transfers;
  ll waiting_minutes;
  ll train_minutes;
  string signature;
};

struct SearchStats {
  double setup_ms = 0;
  double profile_ms = 0;
  double search_ms = 0;
  double total_ms = 0;
  ll instances = 0;
  ll connections = 0;
  ll labels_created = 0;
  ll labels_popped = 0;
  ll pruned_by_cap = 0;
  ll pruned_by_dominance = 0;
  ll duplicate_signatures = 0;
  ll lower_bound = -1;
  bool truncated = false;
};

enum class RouteStatus { Ok, NoRoute, InvalidQuery };

struct RouteResult {
  RouteStatus status = RouteStatus::NoRoute;
  string error;
  vector<Journey> journeys;
  SearchStats stats;
};

namespace detail {

struct WeekPattern {
  struct Instance {
    ll train;
    ll rel_base;
    ll offset;
  };
  struct Connection {
    ll dep_rel;
    ll arr_rel;
    ll inst;
    ll stop;
  };
  ll day_lo = 0;
  ll ndays = 0;
  vector<Instance> instances;
  vector<ll> inst_of;
  vector<Connection> connections;
  ll instance_stops = 0;
};

}  // namespace detail

class Router {
 public:
  Router(const Timetable& tt, RouterConfig cfg);
  RouteResult route(Query q) const;
  const RouterConfig& config() const { return cfg_; }
  const Timetable& timetable() const { return tt_; }

 private:
  const Timetable& tt_;
  RouterConfig cfg_;
  vector<detail::WeekPattern> patterns_;
};

}  // namespace rail
