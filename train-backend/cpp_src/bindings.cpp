#include "json.hpp"
#include "GraphEngine.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <deque>
using namespace std;
namespace fs = filesystem;
using json = nlohmann::json;

StationManager sm;
deque<Train> trains;

void LoadData(const string& path) {
    if (!fs::exists(path)) {
        cerr << "[C++] Data folder not found: " << path << endl;
        return;
    }

    trains.clear();
    sm.stationToTrains.clear();

    for (auto& entry : fs::directory_iterator(path)) {
        if (entry.path().extension() != ".json") continue;
        try {
            ifstream f(entry.path());
            if (!f) continue;
            json j; f >> j;
            Train t;
            auto safeStr = [&](const string& k) {
                return (j.contains(k) && j[k].is_string()) ? j[k].get<string>() : "";
            };

            t.train_number = safeStr("train_number");
            t.train_name   = safeStr("train_name");
            t.type         = safeStr("type");
            t.link         = safeStr("link");

            if (j.contains("operating_days") && j["operating_days"].is_object()) {
                for (auto& [d, r] : j["operating_days"].items()) {
                    if (r.is_boolean()) {
                        string day = d;
                        transform(day.begin(), day.end(), day.begin(), ::tolower);
                        t.operating_days[day] = r.get<bool>();
                    }
                }
            }

            if (j.contains("classes_available") && j["classes_available"].is_array()) {
                for (const auto& c : j["classes_available"]){
                    if (c.is_string()){
                        t.classes.push_back(c.get<string>());
                    } 
                }
            }

            if (j.contains("schedule") && j["schedule"].is_array()) {
                for (const auto& s_json : j["schedule"]) {
                    Stop st;
                    st.station_code = (s_json.contains("station_code") && s_json["station_code"].is_string())
                        ? s_json["station_code"].get<string>() : "";
                    st.sequence_number = s_json.value("sequence_number", 0);

                    auto processTime = [&](const string& key) -> int {
                        if (!s_json.contains(key) || !s_json[key].is_string()){
                            return -1;
                        } 
                        string s = s_json[key].get<string>();
                        if (s == "" || s == "null"){
                            return -1;
                        } 
                        return Stop::timeToMin(s);
                    };

                    int day_of_journey = s_json.value("day_of_journey", 1);
                    int arrClock = processTime("arrival_time");
                    st.arrival_minutes = (arrClock != -1) ? (day_of_journey - 1) * 1440 + arrClock : -1;

                    int depClock = processTime("departure_time");
                    st.departure_minutes = (depClock != -1) ? (day_of_journey - 1) * 1440 + depClock : -1;

                    if (!st.station_code.empty()){
                        t.schedule.push_back(st);
                    } 
                }
            }

            if (!t.train_number.empty() && !t.schedule.empty()) {
                trains.push_back(t);
                Train* tp = &trains.back();
                for (const auto& st : tp->schedule){
                    sm.addTrainToStation(st.station_code, tp);
                } 
            }

        } catch (const exception& e) {
            cerr << "[C++] Error parsing " << entry.path() << ": " << e.what() << endl;
        }
    }
    cerr << "[C++] Loaded " << trains.size() << " trains." << endl;
}

int main(int argc, char* argv[]) {
    string dataPath = (argc > 1) ? argv[1] : "./train_data";
    LoadData(dataPath);
    json ready;
    ready["status"] = "ready";
    ready["trains"] = (int)trains.size();
    cout << ready.dump() << endl;

    string line;
    while (getline(cin, line)) {
        if (line.empty()) continue;
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

        } catch (const exception& e) {
            json err;
            err["req_id"]  = "";
            err["results"] = nullptr;
            err["error"]   = e.what();
            cout << err.dump() << endl;
        }
    }

    return 0;
}