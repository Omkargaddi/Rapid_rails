#include <napi.h>
#include "json.hpp"
#include "GraphEngine.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <deque>
using namespace std;
using namespace Napi;
namespace fs = filesystem;
using json = nlohmann::json;

StationManager sm;
deque<Train> trains;

void LoadData(const string& path){
    if(!fs::exists(path)){
        cout << "[C++] Data folder not found: " << path << endl;
        return;
    }

    trains.clear();
    sm.stationToTrains.clear();

    for(auto& entry : fs::directory_iterator(path)){
        if(entry.path().extension() != ".json") continue;
        try{
            ifstream f(entry.path());
            if(!f) continue;
            json j; f >> j;

            Train t;
            auto safeStr = [&](const string& k){
                return(j.contains(k) && j[k].is_string()) ? j[k].get<string>() : "";
            };

            t.train_number = safeStr("train_number");
            t.train_name   = safeStr("train_name");
            t.type         = safeStr("type");
            t.link         = safeStr("link");

            if(j.contains("operating_days") && j["operating_days"].is_object()){
                for(auto& [d, r] : j["operating_days"].items()){
                    if(r.is_boolean()){
                        string day = d;
                        transform(day.begin(), day.end(), day.begin(), ::tolower);
                        t.operating_days[day] = r.get<bool>();
                    }
                }
            }

            if(j.contains("classes_available") && j["classes_available"].is_array()){
                for(const auto& c : j["classes_available"])
                    if(c.is_string()) t.classes.push_back(c.get<string>());
            }

            if(j.contains("schedule") && j["schedule"].is_array()){
                for(const auto& s_json : j["schedule"]){
                    Stop st;

                    st.station_code =(s_json.contains("station_code") && s_json["station_code"].is_string()) ? s_json["station_code"].get<string>() : "";
                    st.sequence_number = s_json.value("sequence_number", 0);
                    auto processTime = [&](const string& key) -> int{
                        if(!s_json.contains(key) || !s_json[key].is_string()) return -1;
                        string s = s_json[key].get<string>();
                        if(s == "" || s == "null") return -1;
                        return Stop::timeToMin(s);
                    };
                    int day_of_journey = s_json.value("day_of_journey", 1);
                    int arrClock = processTime("arrival_time");
                    if(arrClock != -1) {
                        st.arrival_minutes = (day_of_journey - 1) * 1440 + arrClock;
                    } else {
                        st.arrival_minutes = -1;
                    }

                    int depClock = processTime("departure_time");
                    if(depClock != -1) {
                        st.departure_minutes = (day_of_journey - 1) * 1440 + depClock;
                    } else {
                        st.departure_minutes = -1;
                    }

                    if(!st.station_code.empty()) t.schedule.push_back(st);
                }
            }

            if(!t.train_number.empty() && !t.schedule.empty()){
                trains.push_back(t);
                Train* tp = &trains.back();
                for(const auto& st : tp->schedule) sm.addTrainToStation(st.station_code, tp);
            }

        } catch(const exception& e){
            cout << "[C++] Error parsing " << entry.path() << ": " << e.what() << endl;
        }
    }
    cout << "[C++] Database loaded. Trains: " << trains.size() << endl;
}

class RouteWorker : public AsyncWorker{
public:
    RouteWorker(Napi::Env env, Promise::Deferred deferred, 
            string src, string dst, int day, int minB, int maxB, int maxLegs, string pref)
    : AsyncWorker(env),
      deferred(deferred),
      src(src),
      dst(dst),
      pref(pref), 
      day(day),
      minB(minB),
      maxB(maxB),
      maxLegs(maxLegs) {}

    void Execute() override{
        try{
            results = GraphEngine::convenient(sm, src, dst, day, minB, maxB, maxLegs);    
        } catch(const exception& e){
            SetError(e.what());
        }
    }

    void OnOK() override{
        Napi::Env env = Env();
        json j_out = results; 
        string jsonStr = j_out.dump();
        
        Object global = env.Global();
        Object json_obj = global.Get("JSON").As<Object>();
        Function parse = json_obj.Get("parse").As<Function>();
        Value result_obj = parse.Call({ String::New(env, jsonStr) });
        
        deferred.Resolve(result_obj);
    }

    void OnError(const Error& e) override {
        deferred.Reject(e.Value());
    }

private:
    Promise::Deferred deferred;
    string src, dst, pref;
    int day, minB, maxB, maxLegs;
    vector<JourneyResponse> results;
};

Value InitEngine(const CallbackInfo& info){
    Env env = info.Env();
    if(info.Length() < 1 || !info[0].IsString()){
        TypeError::New(env, "String path expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    string path = info[0].As<String>();
    LoadData(path);
    return Boolean::New(env, true);
}


Value FindRoute(const Napi::CallbackInfo& info){
    Env env = info.Env();
    
    if(info.Length() < 1 || !info[0].IsObject()){
        TypeError::New(env, "Options object expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Object opts = info[0].As<Object>();
    
    string src = opts.Has("source") ? opts.Get("source").As<String>().Utf8Value() : "";
    string dst = opts.Has("destination") ? opts.Get("destination").As<String>().Utf8Value() : "";
    int day = opts.Has("day") ? opts.Get("day").As<Number>().Int32Value() : 1;
    int minB = opts.Has("min_buffer") ? opts.Get("min_buffer").As<Number>().Int32Value() : 30;
    int maxB = opts.Has("max_buffer") ? opts.Get("max_buffer").As<Number>().Int32Value() : 480;
    int maxLegs = opts.Has("max_legs") ? opts.Get("max_legs").As<Number>().Int32Value() : 8;
    string pref = opts.Has("preference") ? opts.Get("preference").As<String>().Utf8Value() : "convenient";

    Promise::Deferred deferred = Promise::Deferred::New(env);
    RouteWorker* worker = new RouteWorker(env, deferred, src, dst, day, minB, maxB, maxLegs, pref);
    worker->Queue();
    return deferred.Promise();
}

Object Init(Env env, Object exports){
    exports.Set("init", Function::New(env, InitEngine));
    exports.Set("findRoute", Function::New(env, FindRoute));
    return exports;
}

NODE_API_MODULE(train_engine, Init)