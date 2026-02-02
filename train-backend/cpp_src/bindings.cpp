#include <napi.h>
#include "json.hpp"
#include "GraphEngine.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <deque>

namespace fs = std::filesystem;
using json = nlohmann::json;

StationManager sm;
std::deque<Train> trains;

void LoadData(const std::string& path) {
    if (!fs::exists(path)) {
        std::cerr << "[C++] Data folder not found: " << path << std::endl;
        return;
    }

    trains.clear();
    sm.stationToTrains.clear();

    for (const auto& entry : fs::directory_iterator(path)) {
        if (entry.path().extension() != ".json") continue;

        try {
            std::ifstream f(entry.path());
            if (!f) continue;
            json j; f >> j;

            Train t;
            auto safeStr = [&](const std::string& k) {
                return (j.contains(k) && j[k].is_string()) ? j[k].get<std::string>() : "";
            };

            t.train_number = safeStr("train_number");
            t.train_name   = safeStr("train_name");
            t.type         = safeStr("type");
            t.link         = safeStr("link");

            if (j.contains("operating_days") && j["operating_days"].is_object()) {
                for (auto& [d, r] : j["operating_days"].items()) {
                    if (r.is_boolean()) {
                        std::string day = d;
                        std::transform(day.begin(), day.end(), day.begin(), ::tolower);
                        t.operating_days[day] = r.get<bool>();
                    }
                }
            }

            if (j.contains("classes_available") && j["classes_available"].is_array()) {
                for (const auto& c : j["classes_available"])
                    if (c.is_string()) t.classes.push_back(c.get<std::string>());
            }

            if (j.contains("schedule") && j["schedule"].is_array()) {
                int cumulative = 0;
                int last_total_minutes = -1;

                for (const auto& s_json : j["schedule"]) {
                    Stop st;
                    st.station_code = (s_json.contains("station_code") && s_json["station_code"].is_string()) 
                                      ? s_json["station_code"].get<std::string>() : "";
                    st.sequence_number = s_json.value("sequence_number", 0);

                    auto processTime = [&](const std::string& key) -> int {
                        if (!s_json.contains(key) || !s_json[key].is_string()) return -1;
                        std::string s = s_json[key].get<std::string>();
                        if (s == "" || s == "null") return -1;
                        return Stop::timeToMin(s);
                    };

                    int arrClock = processTime("arrival_time");
                    if (arrClock != -1) {
                         if (last_total_minutes != -1 && arrClock < (last_total_minutes % 1440)) cumulative += 1440;
                         st.arrival_minutes = cumulative + arrClock;
                         last_total_minutes = st.arrival_minutes;
                    } else st.arrival_minutes = -1;

                    int depClock = processTime("departure_time");
                    if (depClock != -1) {
                         if (last_total_minutes != -1 && depClock < (last_total_minutes % 1440)) cumulative += 1440;
                         st.departure_minutes = cumulative + depClock;
                         last_total_minutes = st.departure_minutes;
                    } else st.departure_minutes = -1;

                    if (!st.station_code.empty()) t.schedule.push_back(st);
                }
            }

            if (!t.train_number.empty() && !t.schedule.empty()) {
                trains.push_back(t);
                Train* tp = &trains.back();
                for (const auto& st : tp->schedule) sm.addTrainToStation(st.station_code, tp);
            }

        } catch (const std::exception& e) {
            std::cerr << "[C++] Error parsing " << entry.path() << ": " << e.what() << std::endl;
        }
    }
    std::cout << "[C++] Database loaded. Trains: " << trains.size() << std::endl;
}

class RouteWorker : public Napi::AsyncWorker {
public:
    RouteWorker(Napi::Function& callback, 
                std::string src, std::string dst, 
                int day, int minB, int maxB, int maxLegs, std::string pref)
        : Napi::AsyncWorker(callback), 
          src(src), dst(dst), day(day), 
          minB(minB), maxB(maxB), maxLegs(maxLegs), pref(pref) {}

    void Execute() override {
        try {
            if (pref == "fastest") {
                results = GraphEngine::fastest(sm, src, dst, day, minB, 480, 8);
            } else {
                results = GraphEngine::convenient(sm, src, dst, day, minB, maxB, maxLegs);
            }
        } catch (const std::exception& e) {
            SetError(e.what());
        }
    }

    void OnOK() override {
        Napi::Env env = Env();
        
        json j_out = results; 
        std::string jsonStr = j_out.dump();
        Callback().Call({env.Null(), Napi::String::New(env, jsonStr)});
    }

private:
    std::string src, dst, pref;
    int day, minB, maxB, maxLegs;
    std::vector<JourneyResponse> results;
};

Napi::Value InitEngine(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String path expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string path = info[0].As<Napi::String>();
    LoadData(path);
    return Napi::Boolean::New(env, true);
}

Napi::Value FindRoute(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Options object expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object opts = info[0].As<Napi::Object>();
    
    // Extract parameters with defaults
    std::string src = opts.Has("source") ? opts.Get("source").As<Napi::String>().Utf8Value() : "";
    std::string dst = opts.Has("destination") ? opts.Get("destination").As<Napi::String>().Utf8Value() : "";
    int day = opts.Has("day") ? opts.Get("day").As<Napi::Number>().Int32Value() : 1;
    int minB = opts.Has("min_buffer") ? opts.Get("min_buffer").As<Napi::Number>().Int32Value() : 30;
    int maxB = opts.Has("max_buffer") ? opts.Get("max_buffer").As<Napi::Number>().Int32Value() : 480;
    int maxLegs = opts.Has("max_legs") ? opts.Get("max_legs").As<Napi::Number>().Int32Value() : 8;
    std::string pref = opts.Has("preference") ? opts.Get("preference").As<Napi::String>().Utf8Value() : "convenient";

    Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);

    auto callback = Napi::Function::New(env, [deferred](const Napi::CallbackInfo& info) {
        if (info[0].IsNull()) {
            Napi::Env env = info.Env();
            std::string jsonStr = info[1].As<Napi::String>();
            Napi::Object global = env.Global();
            Napi::Object json = global.Get("JSON").As<Napi::Object>();
            Napi::Function parse = json.Get("parse").As<Napi::Function>();
            Napi::Value result = parse.Call({ Napi::String::New(env, jsonStr) });
            
            deferred.Resolve(result);
        } else {
            deferred.Reject(info[0].As<Napi::Error>().Value());
        }
    });
    RouteWorker* worker = new RouteWorker(callback, src, dst, day, minB, maxB, maxLegs, pref);
    worker->Queue();

    return deferred.Promise();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("init", Napi::Function::New(env, InitEngine));
    exports.Set("findRoute", Napi::Function::New(env, FindRoute));
    return exports;
}

NODE_API_MODULE(train_engine, Init)