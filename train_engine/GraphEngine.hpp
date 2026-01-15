#ifndef GRAPHENGINE_HPP
#define GRAPHENGINE_HPP

#include "StationManager.hpp"
#include <queue>
#include <unordered_map>
#include <vector>
#include <algorithm>
constexpr int MAX_EXPANSIONS   = 100000;
constexpr int MAX_JOURNEY_TIME = 96 * 60;
constexpr int MAX_LEGS         = 8;
constexpr int MAX_RESULTS      = 20;

constexpr int TRANSFER_PENALTY = 300; 
constexpr int WAIT_PENALTY     = 1;   

struct Node {
    JourneyLeg leg;
    int parent;
};

struct State {
    std::string station;
    int abs_time;
    int start_dep_abs; 
    int legs;
    int total_wait;
    int node_idx;
};

struct VisitKey {
    std::string station;
    int legs;
    int start_dep_abs; 
    bool operator==(const VisitKey& o) const {
        return station == o.station && legs == o.legs && start_dep_abs == o.start_dep_abs;
    }
};

struct VisitKeyHash {
    size_t operator()(const VisitKey& k) const {
        size_t h1 = std::hash<std::string>()(k.station);
        size_t h2 = std::hash<int>()(k.legs);
        size_t h3 = std::hash<int>()(k.start_dep_abs);
        return h1 ^ (h2 << 1) ^ (h3 << 2);
    }
};

inline int getDuration(const State& s) {
    if (s.start_dep_abs == -1) return 0;
    return s.abs_time - s.start_dep_abs;
}

inline int nextDeparture(int curAbs, int depFromOrigin) {
    int dayStart = (curAbs / 1440) * 1440;
    int dep = dayStart + depFromOrigin;
    if (dep < curAbs) dep += 1440;
    return dep;
}

inline std::vector<JourneyLeg> reconstruct(const std::vector<Node>& nodes, int idx) {
    std::vector<JourneyLeg> path;
    while (idx != -1) {
        path.push_back(nodes[idx].leg);
        idx = nodes[idx].parent;
    }
    std::reverse(path.begin(), path.end());
    return path;
}

struct FastestCmp {
    bool operator()(const State& a, const State& b) const {
        int da = getDuration(a);
        int db = getDuration(b);
        if (da != db) return da > db;
        return a.legs > b.legs;
    }
};

struct EarliestCmp {
    bool operator()(const State& a, const State& b) const {
        if (a.abs_time != b.abs_time) return a.abs_time > b.abs_time;
        return a.legs > b.legs;
    }
};

struct ConvenientCmp {
    bool operator()(const State& a, const State& b) const {
        int ca = getDuration(a) + (a.legs * TRANSFER_PENALTY) + (a.total_wait * WAIT_PENALTY);
        int cb = getDuration(b) + (b.legs * TRANSFER_PENALTY) + (b.total_wait * WAIT_PENALTY);
        if (ca != cb) return ca > cb;
        return a.legs > b.legs;
    }
};

class GraphEngine {
private:
static void expand(
    StationManager& sm,
    std::vector<Node>& nodes,
    std::vector<State>& out,
    const State& cur,
    int minB,
    int maxB,
    int maxLegs 
) {
    if (sm.stationToTrains.find(cur.station) == sm.stationToTrains.end()) return;

    for (Train* t : sm.stationToTrains[cur.station]) {
        const Stop* sStop = nullptr;
        for (auto& s : t->schedule)
            if (s.station_code == cur.station) { sStop = &s; break; }

        if (!sStop || sStop->departure_minutes < 0) continue;

        int depAbs = nextDeparture(cur.abs_time, sStop->departure_minutes);
        bool foundRun = false;
        for (int i = 0; i < 7; ++i) { 
            int runDay = ((depAbs / 1440) % 7) + 1;
            if (t->runsOn(runDay)) {
                foundRun = true;
                break;
            }
            depAbs += 1440;
        }

        if (!foundRun) continue;

        int wait = depAbs - cur.abs_time;
        if (cur.legs > 0 && (wait < minB || wait > maxB)) continue;
        if (cur.legs == 0 && wait > 2880) continue; 

        for (auto& dStop : t->schedule) {
            if (dStop.sequence_number <= sStop->sequence_number) continue;

            int arrAbs = depAbs - sStop->departure_minutes + dStop.arrival_minutes;
            int startDep = (cur.start_dep_abs == -1) ? depAbs : cur.start_dep_abs;

            if (arrAbs - startDep > MAX_JOURNEY_TIME) continue;
            
            if (cur.legs + 1 > maxLegs) continue;
            if (cur.legs + 1 > MAX_LEGS) continue; 

            nodes.push_back({
                JourneyLeg(t->train_number, t->train_name, t->type, 
                            cur.station, dStop.station_code, t->link, 
                            depAbs, arrAbs, t->classes),
                cur.node_idx
            });

            out.push_back({
                dStop.station_code, arrAbs, startDep, cur.legs + 1,
                cur.total_wait + (cur.legs > 0 ? wait : 0),
                (int)nodes.size() - 1
            });
        }
    }
}

public:

static std::vector<JourneyResponse> fastest(
    StationManager& sm, const std::string& src, const std::string& dst, 
    int day, int minB, int maxB, int maxLegs
) {
    std::vector<Node> nodes;
    std::priority_queue<State, std::vector<State>, FastestCmp> pq;
    std::unordered_map<VisitKey, int, VisitKeyHash> visited;
    std::vector<JourneyResponse> results;

    pq.push({src, (day - 1) * 1440, -1, 0, 0, -1});

    int exp = 0;
    while (!pq.empty() && exp++ < MAX_EXPANSIONS && results.size() < MAX_RESULTS) {
        State cur = pq.top(); pq.pop();

        if (cur.station == dst) {
            auto path = reconstruct(nodes, cur.node_idx);
            results.push_back({JourneyResponse::generateHash(path), path, getDuration(cur)});
            continue;
        }
        VisitKey k{cur.station, cur.legs, cur.start_dep_abs};
        int cost = getDuration(cur);
        if (visited.count(k) && visited[k] <= cost) continue;
        visited[k] = cost;
        std::vector<State> next;
        expand(sm, nodes, next, cur, minB, maxB, maxLegs);
        for (auto& s : next) pq.push(s);
    }
    return results;
}
static std::vector<JourneyResponse> convenient(
    StationManager& sm, const std::string& src, const std::string& dst, 
    int day, int minB, int maxB, int maxLegs
) {
    std::vector<Node> nodes;
    std::priority_queue<State, std::vector<State>, ConvenientCmp> pq;
    std::unordered_map<VisitKey, int, VisitKeyHash> visited;
    std::vector<JourneyResponse> results;

    pq.push({src, (day - 1) * 1440, -1, 0, 0, -1});

    int exp = 0;
    while (!pq.empty() && exp++ < MAX_EXPANSIONS && results.size() < MAX_RESULTS) {
        State cur = pq.top(); pq.pop();

        if (cur.station == dst) {
            auto path = reconstruct(nodes, cur.node_idx);
            results.push_back({JourneyResponse::generateHash(path), path, getDuration(cur)});
            continue;
        }

        VisitKey k{cur.station, cur.legs, cur.start_dep_abs};
        int cost = getDuration(cur) + (cur.legs * TRANSFER_PENALTY) + (cur.total_wait * WAIT_PENALTY);
        if (visited.count(k) && visited[k] <= cost) continue;
        visited[k] = cost;

        std::vector<State> next;
        expand(sm, nodes, next, cur, minB, maxB, maxLegs);
        for (auto& s : next) pq.push(s);
    }
    return results;
}
};

#endif