#ifndef DATAMODELS_HPP
#define DATAMODELS_HPP
#include <algorithm>
#include <map>
#include <string>
#include <vector>
#include <iomanip>
#include <sstream>
#include "json.hpp"

using namespace std;
using json = nlohmann::json;

struct Stop {
    string station_code;
    int arrival_minutes;   
    int departure_minutes; 
    int sequence_number;

    // Time relative to 00:00
    static int timeToMin(const string &s) {
        if (s.empty() || s == "null" || s == "SRC" || s == "DSTN") return 0;
        try {
            int h = stoi(s.substr(0, 2));
            int m = stoi(s.substr(3, 2));
            return h * 60 + m;
        } catch (...) { return 0; }
    }


    static string minToClock(int m) {
        m = (m % 1440 + 1440) % 1440;
        stringstream ss;
        ss << setw(2) << setfill('0') << (m / 60) << ":" 
           << setw(2) << setfill('0') << (m % 60);
        return ss.str();
    }
};

struct JourneyLeg {
    string train_num, train_name, train_type, from, to, link;
    int dep_abs, arr_abs, dep_day, arr_day;
    string dep_clock, arr_clock;
    vector<string> classes;

    JourneyLeg(const string &tn, const string &tname, const string &ty,const string &f, const string &t, const string &l,
               int d_abs, int a_abs, const vector<string> &cls)
        : train_num(tn), train_name(tname), train_type(ty), from(f), to(t), link(l),
          dep_abs(d_abs), arr_abs(a_abs), classes(cls) {
        dep_day = (d_abs / 1440) + 1;
        arr_day = (a_abs / 1440) + 1;
        dep_clock = Stop::minToClock(d_abs);
        arr_clock = Stop::minToClock(a_abs);
    }
};

struct JourneyResponse {
    string hash;
    vector<JourneyLeg> legs;
    int total_duration;

    static string generateHash(const vector<JourneyLeg> &legs) {
        stringstream ss;
        for (const auto &leg : legs) ss << leg.train_num << "|" << leg.from << "|" << leg.to << "|";
        return to_string(std::hash<string>{}(ss.str()));
    }
};

inline void to_json(json &j, const JourneyLeg &l) {
    j = json{{"train_num", l.train_num}, {"train_name", l.train_name}, {"train_type", l.train_type},
             {"from", l.from}, {"to", l.to}, {"dep_abs", l.dep_abs}, {"arr_abs", l.arr_abs},
             {"dep_day", l.dep_day}, {"arr_day", l.arr_day}, {"dep_clock", l.dep_clock},
             {"arr_clock", l.arr_clock}, {"classes_available", l.classes}, {"link", l.link}};
}

inline void to_json(json &j, const JourneyResponse &r) {
    j = json{{"hash", r.hash}, {"legs", r.legs}, {"total_duration", r.total_duration}};
}

class Train {
public:
    string train_number, train_name, type, link;
    vector<string> classes;
    vector<Stop> schedule;
    map<string, bool> operating_days;

    bool runsOn(int dayNum) {
        static vector<string> dNames = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"};
        string name = dNames[(dayNum - 1) % 7];
        return operating_days.count(name) && operating_days[name];
    }
};
#endif