#include <bits/stdc++.h>
#include "journey_json.h"
typedef long long ll;
typedef unsigned long long ull;
using namespace std;

namespace rail {

using nlohmann::json;

static void append_json_string(string& out, string_view v) {
  out += '"';
  for (char c : v) {
    unsigned char u = (unsigned char)c;
    if (c == '"' || c == '\\') {
      out += '\\';
      out += c;
    } else if (u < 0x20) {
      char buf[8];
      snprintf(buf, sizeof buf, "\\u%04x", u);
      out += buf;
    } else {
      out += c;
    }
  }
  out += '"';
}

static void append_num(string& out, ll v) {
  out += to_string(v);
}

static void append_ms(string& out, double v) {
  char buf[32];
  snprintf(buf, sizeof buf, "%.3f", v);
  out += buf;
}

string compact_json(const Timetable& tt, const Query& q, const RouteResult& r, string worker) {
  auto& st = r.stats;
  string out;
  out.reserve(256 + r.journeys.size() * 160);

  out += "{\"status\":";
  if (r.status == RouteStatus::Ok) {
    out += "\"ok\"";
  } else {
    out += "\"no_route\"";
  }

  out += ",\"search_complete\":";
  if (st.truncated) {
    out += "false";
  } else {
    out += "true";
  }

  out += ",\"worker\":";
  append_json_string(out, worker);

  out += ",\"timetable\":";
  append_json_string(out, tt.hash);

  out += ",\"search_minute\":";
  ll search_minute = q.date_day * 1440 + q.time_minute;
  append_num(out, search_minute);

  out += ",\"stats\":{\"total_ms\":";
  append_ms(out, st.total_ms);

  out += ",\"profile_ms\":";
  append_ms(out, st.profile_ms);

  out += ",\"search_ms\":";
  append_ms(out, st.search_ms);

  out += ",\"labels_popped\":";
  append_num(out, st.labels_popped);

  out += ",\"truncated\":";
  if (st.truncated) {
    out += "true";
  } else {
    out += "false";
  }
  out += "},\"journeys\":[";

  for (ll ji = 0; ji < (ll)r.journeys.size(); ++ji) {
    Journey j = r.journeys[ji];
    if (ji > 0) {
      out += ',';
    }

    out += "{\"signature\":";
    append_json_string(out, j.signature);

    out += ",\"dep\":";
    append_num(out, j.departure);

    out += ",\"arr\":";
    append_num(out, j.arrival);

    out += ",\"transfers\":";
    append_num(out, j.transfers);

    out += ",\"train_minutes\":";
    append_num(out, j.train_minutes);

    out += ",\"waiting_minutes\":";
    append_num(out, j.waiting_minutes);

    out += ",\"legs\":[";
    for (ll li = 0; li < (ll)j.legs.size(); ++li) {
      Leg l = j.legs[li];
      if (li > 0) {
        out += ',';
      }
      out += '[';
      append_num(out, l.train);
      out += ',';
      append_num(out, l.board_stop);
      out += ',';
      append_num(out, l.alight_stop);
      out += ',';
      append_num(out, l.start_day);
      out += ']';
    }
    out += "]}";
  }

  out += "]}";
  return out;
}

json config_to_json(RouterConfig c) {
  return {{"min_transfer_minutes", c.min_transfer_minutes},
          {"max_transfers", c.max_transfers},
          {"top_k", c.top_k},
          {"k_node", c.k_node},
          {"horizon_minutes", c.horizon_minutes},
          {"max_labels", c.max_labels},
          {"prune_stay_on", c.prune_stay_on},
          {"prune_board_earlier", c.prune_board_earlier}};
}

}  // namespace rail
