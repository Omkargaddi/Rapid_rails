//   POST /route 
//   GET  /health

#include <bits/stdc++.h>
#include <pthread.h>
#include "civil_time.h"
#include "httplib.h"
#include "journey_json.h"
#include "router.h"
typedef long long ll;
typedef unsigned long long ull;

using namespace std;
using json = nlohmann::json;

namespace {

int g_threads = 8;
rail::Timetable* g_tt = nullptr;
rail::Router* g_router = nullptr;
string g_worker_id = "engine";
double g_load_ms = 0.0;
atomic<ull> g_requests{0};
atomic<ull> g_errors{0};
atomic<ull> g_total_route_us{0};
atomic<bool> g_draining{false};
httplib::Server* g_srv = nullptr;
httplib::Server* g_admin = nullptr;
sigset_t g_stop_signals;
int g_grace_ms = 3000;

ll env_int(const char* name, ll def) {
  const char* v = getenv(name);
  if (v == nullptr || *v == '\0') {
    return def;
  }
  try {
    return stoll(v);
  } catch (...) {
    cerr << "invalid integer for " << name << ", using " << def << "\n";
    return def;
  }
}

string env_str(const char* name, string def) {
  const char* v = getenv(name);
  if (v != nullptr && *v != '\0') {
    return string(v);
  } else {
    return def;
  }
}

mutex log_mu;
void log_line(json j) {
  lock_guard<mutex> lk(log_mu);
  cout << j.dump() << endl;
}

void reply(httplib::Response& res, int status, json body) {
  res.status = status;
  res.set_content(body.dump(), "application/json");
}

httplib::TaskQueue* make_server_thread_pool() {
  return new httplib::ThreadPool((size_t)g_threads);
}

httplib::TaskQueue* make_admin_thread_pool() {
  return new httplib::ThreadPool(2);
}

string get_json_string(const json& body, const char* k) {
  if (body.contains(k) && body[k].is_string()) {
    return body[k].get<string>();
  }
  return string();
}

void handle_health(const httplib::Request& req, httplib::Response& res) {
  (void)req;
  ull n = g_requests.load();
  bool drain = g_draining.load();

  int status_code = 200;
  string status_str = "ok";
  if (drain) {
    status_code = 503;
    status_str = "draining";
  }

  double avg_ms = 0.0;
  if (n > 0) {
    avg_ms = g_total_route_us.load() / 1000.0 / n;
  }

  reply(res, status_code,
        {{"status", status_str},
         {"worker", g_worker_id},
         {"timetable", g_tt->hash},
         {"stations", g_tt->stations.size()},
         {"trains", g_tt->trains.size()},
         {"load_ms", g_load_ms},
         {"requests", n},
         {"errors", g_errors.load()},
         {"avg_route_ms", avg_ms},
         {"config", rail::config_to_json(g_router->config())}});
}

void handle_route(const httplib::Request& req, httplib::Response& res) {
  json body;
  try {
    body = json::parse(req.body);
  } catch (...) {
    g_errors.fetch_add(1);
    return reply(res, 400, {{"status", "invalid"}, {"error", "body is not valid JSON"}});
  }

  rail::Query q;
  q.source = g_tt->find_station(get_json_string(body, "source"));
  q.destination = g_tt->find_station(get_json_string(body, "destination"));
  auto day = rail::parse_date(get_json_string(body, "date"));
  auto tm = rail::parse_hhmm(get_json_string(body, "time"));

  if (q.source < 0 || q.destination < 0 || !day.has_value() || !tm.has_value()) {
    g_errors.fetch_add(1);

    string err_msg = "";
    if (q.source < 0) {
      err_msg = "unknown source station";
    } else if (q.destination < 0) {
      err_msg = "unknown destination station";
    } else if (!day.has_value()) {
      err_msg = "date must be YYYY-MM-DD";
    } else {
      err_msg = "time must be HH:MM";
    }

    return reply(res, 400, {{"status", "invalid"}, {"error", err_msg}});
  }

  q.date_day = *day;
  q.time_minute = *tm;
  q.limit = 0;
  if (body.contains("limit") && body["limit"].is_number_integer()) {
    q.limit = body["limit"].get<ll>();
  }

  rail::RouteResult r = g_router->route(q);
  if (r.status == rail::RouteStatus::InvalidQuery) {
    g_errors.fetch_add(1);
    return reply(res, 400, {{"status", "invalid"}, {"error", r.error}});
  }

  g_requests.fetch_add(1);
  g_total_route_us.fetch_add((ull)(r.stats.total_ms * 1000));

  res.set_content(rail::compact_json(*g_tt, q, r, g_worker_id), "application/json");
  res.status = 200;
}

void handle_exception(const httplib::Request& req, httplib::Response& res, exception_ptr ep) {
  (void)req;
  g_errors.fetch_add(1);
  string what = "internal error";
  try {
    if (ep) rethrow_exception(ep);
  } catch (const exception& e) {
    what = e.what();
  } catch (...) {
  }
  log_line({{"level", "error"}, {"msg", "handler exception"}, {"error", what}});
  reply(res, 500, {{"status", "error"}, {"error", "internal error"}});
}

void run_admin_listener() {
  g_admin->listen_after_bind();
}

void run_signal_drain() {
  int sig = 0;
  sigwait(&g_stop_signals, &sig);
  g_draining = true;
  log_line({{"level", "info"}, {"msg", "draining"}, {"signal", sig}, {"grace_ms", g_grace_ms}});
  this_thread::sleep_for(chrono::milliseconds(g_grace_ms));
  g_srv->wait_until_ready();
  g_srv->stop();
}

}  // namespace

int main() {
  sigemptyset(&g_stop_signals);
  sigaddset(&g_stop_signals, SIGTERM);
  sigaddset(&g_stop_signals, SIGINT);
  pthread_sigmask(SIG_BLOCK, &g_stop_signals, nullptr);

  auto t0 = chrono::steady_clock::now();
  string path = env_str("TIMETABLE_PATH", "../data/processed/timetable.json");

  rail::RouterConfig cfg;
  cfg.min_transfer_minutes = env_int("MIN_TRANSFER_MINUTES", cfg.min_transfer_minutes);
  cfg.max_transfers = env_int("MAX_TRANSFERS_INTERNAL", cfg.max_transfers);
  cfg.top_k = env_int("TOP_K", cfg.top_k);
  cfg.k_node = env_int("K_NODE", cfg.k_node);

  ll prune_stay = env_int("PRUNE_STAY_ON", 1);
  if (prune_stay != 0) {
    cfg.prune_stay_on = true;
  } else {
    cfg.prune_stay_on = false;
  }

  ll prune_board = env_int("PRUNE_BOARD_EARLIER", 1);
  if (prune_board != 0) {
    cfg.prune_board_earlier = true;
  } else {
    cfg.prune_board_earlier = false;
  }

  cfg.horizon_minutes = env_int("SEARCH_HORIZON_MINUTES", cfg.horizon_minutes);
  cfg.max_labels = env_int("MAX_LABELS", cfg.max_labels);

  string host = env_str("ENGINE_HOST", "0.0.0.0");
  int port = (int)env_int("ENGINE_PORT", 7070);
  g_threads = (int)env_int("ENGINE_THREADS", 8);
  int admin_port = (int)env_int("ADMIN_PORT", 7071);
  g_grace_ms = (int)env_int("SHUTDOWN_GRACE_MS", 3000);
  g_worker_id = env_str("WORKER_ID", "engine");

  rail::Timetable tt;
  try {
    tt = rail::load_timetable_json(path);
  } catch (const exception& e) {
    log_line({{"level", "fatal"}, {"msg", "failed to load timetable"}, {"path", path}, {"error", e.what()}});
    return 1;
  }
  g_tt = &tt;

  rail::Router router(tt, cfg);
  g_router = &router;

  g_load_ms = chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count();
  log_line({{"level", "info"},
            {"msg", "timetable loaded"},
            {"path", path},
            {"timetable", tt.hash},
            {"stations", tt.stations.size()},
            {"trains", tt.trains.size()},
            {"stops", tt.stops.size()},
            {"load_ms", g_load_ms},
            {"config", rail::config_to_json(router.config())}});

  httplib::Server srv;
  g_srv = &srv;
  srv.new_task_queue = make_server_thread_pool;
  srv.set_tcp_nodelay(true);

  srv.Get("/health", handle_health);
  srv.Post("/route", handle_route);
  srv.set_exception_handler(handle_exception);

  httplib::Server admin;
  g_admin = &admin;
  admin.new_task_queue = make_admin_thread_pool;
  admin.set_tcp_nodelay(true);
  admin.Get("/health", handle_health);

  thread admin_thread;
  if (admin_port > 0) {
    if (!admin.bind_to_port(host, admin_port)) {
      log_line({{"level", "fatal"}, {"msg", "failed to bind"}, {"host", host}, {"port", admin_port}});
      return 1;
    }
    admin_thread = thread(run_admin_listener);
  }

  thread(run_signal_drain).detach();

  log_line({{"level", "info"},
            {"msg", "listening"},
            {"host", host},
            {"port", port},
            {"admin_port", admin_port},
            {"threads", g_threads},
            {"worker", g_worker_id}});

  if (!srv.listen(host, port)) {
    log_line({{"level", "fatal"}, {"msg", "failed to bind"}, {"host", host}, {"port", port}});
    _Exit(1);
  }
  if (admin_thread.joinable()) {
    admin.stop();
    admin_thread.join();
  }
  log_line({{"level", "info"}, {"msg", "stopped"}, {"requests", g_requests.load()}});
  return 0;
}
