#include <bits/stdc++.h>
#include "json.hpp"
#include "GraphEngine.hpp"

using namespace std;
namespace fs = filesystem;
using json = nlohmann::json;

StationManager sm;
deque<Train> trains;

void LoadData(string path) {
    if (!fs::exists(path)) {
        cerr << "[C++] Data folder not found: " << path << endl;
        return;
    }

    trains.clear();
    sm.stationToTrains.clear();

    for (auto& entry : fs::directory_iterator(path)) {
        if (entry.path().extension() != ".json") {
            continue;
        }
        try {
            ifstream f(entry.path());
            if (!f) {
                continue;
            }
            json j;
            f >> j;
            Train t;
            auto safeStr = [&](string k) {
                if (j.contains(k)) {
                    if (j[k].is_string()) {
                        return j[k].get<string>();
                    }
                }
                return string("");
            };

            t.train_number = safeStr("train_number");
            t.train_name   = safeStr("train_name");
            t.type         = safeStr("type");
            t.link         = safeStr("link");

            if (j.contains("operating_days")) {
                if (j["operating_days"].is_object()) {
                    for (auto& [d, r] : j["operating_days"].items()) {
                        if (r.is_boolean()) {
                            string day = d;
                            transform(day.begin(), day.end(), day.begin(), ::tolower);
                            t.operating_days[day] = r.get<bool>();
                        }
                    }
                }
            }

            if (j.contains("classes_available")) {
                if (j["classes_available"].is_array()) {
                    for (auto& c : j["classes_available"]){
                        if (c.is_string()){
                            t.classes.push_back(c.get<string>());
                        } 
                    }
                }
            }

            if (j.contains("schedule")) {
                if (j["schedule"].is_array()) {
                    for (auto& s_json : j["schedule"]) {
                        Stop st;
                        if (s_json.contains("station_code")) {
                            if (s_json["station_code"].is_string()) {
                                st.station_code = s_json["station_code"].get<string>();
                            } else {
                                st.station_code = "";
                            }
                        } else {
                            st.station_code = "";
                        }
                        st.sequence_number = s_json.value("sequence_number", 0);

                        auto processTime = [&](string key) -> int {
                            if (!s_json.contains(key)) {
                                return -1;
                            } else if (!s_json[key].is_string()) {
                                return -1;
                            }
                            string s = s_json[key].get<string>();
                            if (s == "") {
                                return -1;
                            } else if (s == "null") {
                                return -1;
                            }
                            return Stop::timeToMin(s);
                        };

                        int day_of_journey = s_json.value("day_of_journey", 1);
                        int arrClock = processTime("arrival_time");
                        if (arrClock != -1) {
                            st.arrival_minutes = (day_of_journey - 1) * 1440 + arrClock;
                        } else {
                            st.arrival_minutes = -1;
                        }

                        int depClock = processTime("departure_time");
                        if (depClock != -1) {
                            st.departure_minutes = (day_of_journey - 1) * 1440 + depClock;
                        } else {
                            st.departure_minutes = -1;
                        }

                        if (!st.station_code.empty()){
                            t.schedule.push_back(st);
                        } 
                    }
                }
            }

            if (!t.train_number.empty()) {
                if (!t.schedule.empty()) {
                    trains.push_back(t);
                    Train* tp = &trains.back();
                    for (auto& st : tp->schedule){
                        sm.addTrainToStation(st.station_code, tp);
                    } 
                }
            }

        } catch (exception& e) {
            cerr << "[C++] Error parsing " << entry.path() << ": " << e.what() << endl;
        }
    }
    cerr << "[C++] Loaded " << trains.size() << " trains." << endl;
}

int main(int argc, char* argv[]) {
    string dataPath;
    if (argc > 1) {
        dataPath = argv[1];
    } else {
        dataPath = "./train_data";
    }

    LoadData(dataPath);
    json ready;
    ready["status"] = "ready";
    ready["trains"] = (int)trains.size();
    cout << ready.dump() << endl;

    string line;
    while (getline(cin, line)) {
        if (line.empty()) {
            continue;
        }
        try {
            json req = json::parse(line);

            string src    = req.value("source", "");
            string dst    = req.value("destination", "");
            int day       = req.value("day", 1);
            int minB      = req.value("min_buffer", 30);
            int maxB      = req.value("max_buffer", 480);
            int maxLegs   = req.value("max_legs", 8);
            string req_id = req.value("req_id", "");

            vector<JourneyResponse> results =
                GraphEngine::convenient(sm, src, dst, day, minB, maxB, maxLegs);

            json resp = results;
            json out;
            out["req_id"]  = req_id;
            out["results"] = resp;
            out["error"]   = nullptr;

            cout << out.dump() << endl;

        } catch (exception& e) {
            json err;
            err["req_id"]  = "";
            err["results"] = nullptr;
            err["error"]   = e.what();
            cout << err.dump() << endl;
        }
    }

    return 0;
}