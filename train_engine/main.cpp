#include "httplib.h"
#include "json.hpp"
#include "GraphEngine.hpp"
#include <fstream>
#include <filesystem>
#include <deque>
#include <iostream>
#include <algorithm>

using json = nlohmann::json;
namespace fs = std::filesystem;

// Global state
StationManager sm;
std::deque<Train> trains;

// Helper to safely extract strings from JSON
static std::string safeStr(const json& j, const std::string& key) {
    if (!j.contains(key) || j[key].is_null() || !j[key].is_string())
        return "";
    return j[key].get<std::string>();
}
void load(const std::string& path) {
    if (!fs::exists(path)) {
        std::cerr << "Data folder not found: " << path << std::endl;
        return;
    }

    for (const auto& entry : fs::directory_iterator(path)) {
        if (entry.path().extension() != ".json") continue;

        try {
            std::ifstream f(entry.path());
            if (!f) continue;
            json j; f >> j;

            Train t;
            t.train_number = safeStr(j, "train_number");
            t.train_name   = safeStr(j, "train_name");
            t.type         = safeStr(j, "type");
            t.link         = safeStr(j, "link");

            // Load operating days
            if (j.contains("operating_days") && j["operating_days"].is_object()) {
                for (auto& [d, r] : j["operating_days"].items()) {
                    if (!r.is_boolean()) continue;
                    std::string day = d;
                    std::transform(day.begin(), day.end(), day.begin(), ::tolower);
                    t.operating_days[day] = r.get<bool>();
                }
            }

            // Load classes
            if (j.contains("classes_available") && j["classes_available"].is_array()) {
                for (const auto& c : j["classes_available"])
                    if (c.is_string()) t.classes.push_back(c.get<std::string>());
            }

            // Monotonic time accumulation
            if (j.contains("schedule") && j["schedule"].is_array()) {
                int cumulative = 0;
                int last_total_minutes = -1;

                for (const auto& s_json : j["schedule"]) {
                    Stop st;
                    st.station_code = safeStr(s_json, "station_code");
                    st.sequence_number = s_json.value("sequence_number", 0);

                    // Arrival accumulation
                    std::string arr_str = safeStr(s_json, "arrival_time");
                    if (arr_str == "" || arr_str == "null") {
                        st.arrival_minutes = -1;
                    } else {
                        int clock = Stop::timeToMin(arr_str);
                        if (last_total_minutes != -1 && clock < (last_total_minutes % 1440)) {
                            cumulative += 1440;
                        }
                        st.arrival_minutes = cumulative + clock;
                        last_total_minutes = st.arrival_minutes;
                    }

                    // Departure accumulation
                    std::string dep_str = safeStr(s_json, "departure_time");
                    if (dep_str == "" || dep_str == "null") {
                        st.departure_minutes = -1;
                    } else {
                        int clock = Stop::timeToMin(dep_str);
                        if (last_total_minutes != -1 && clock < (last_total_minutes % 1440)) {
                            cumulative += 1440;
                        }
                        st.departure_minutes = cumulative + clock;
                        last_total_minutes = st.departure_minutes;
                    }
                    
                    if (!st.station_code.empty()) t.schedule.push_back(st);
                }
            }

            if (t.train_number.empty() || t.schedule.empty()) continue;
            trains.push_back(t);
            Train* tp = &trains.back();
            for (const auto& st : tp->schedule) sm.addTrainToStation(st.station_code, tp);

        } catch (const std::exception& e) {
            std::cerr << "Error parsing " << entry.path() << ": " << e.what() << std::endl;
        }
    }
}

int main() {
    load("./train_data");

    httplib::Server svr;

    // Health check
    svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
        res.set_content("{\"status\":\"ok\"}", "application/json");
    });

    svr.Post("/find-route", [](const httplib::Request& req, httplib::Response& res) {
        try {

            auto j = json::parse(req.body);

            std::string source = j.at("source");
            std::string dest   = j.at("destination");
            int day             = j.value("day", 1);
            int minB            = j.value("min_buffer", 30);
            int maxB            = j.value("max_buffer", 480);
            int maxLegs         = j.value("max_legs", 8);
            std::string pref    = j.value("preference", "convenient");

            if (pref == "fastest") {
    auto r = GraphEngine::fastest(sm, source, dest, day, minB, 480, 8);
    res.set_content(json(r).dump(4), "application/json");

}else { // convenient
    auto r = GraphEngine::convenient(sm, source, dest, day, minB, maxB, maxLegs);
    res.set_content(json(r).dump(4), "application/json");
}


        } catch (const std::exception& e) {
            std::cerr << "[ENGINE ERROR] " << e.what() << std::endl;
            res.status = 400;
            res.set_content(
                json{{"error", e.what()}}.dump(),
                "application/json"
            );
        }
    });

    std::cout << "Graph Engine online at port 8080\n";
    svr.listen("0.0.0.0", 8080);
    return 0;
}
