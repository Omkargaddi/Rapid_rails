#ifndef DATAMODELS_HPP
#define DATAMODELS_HPP

#include "json.hpp"
#include <algorithm>
#include <map>
#include <string>
#include <vector>
#include <iomanip>
#include <sstream>

using json = nlohmann::json;

struct Stop {
    std::string station_code;
    int arrival_minutes;   
    int departure_minutes; 
    int sequence_number;

    static int timeToMin(const std::string &s) {
        if (s.empty() || s == "null" || s == "SRC" || s == "DSTN") return 0;
        try {
            int h = std::stoi(s.substr(0, 2));
            int m = std::stoi(s.substr(3, 2));
            return h * 60 + m;
        } catch (...) { return 0; }
    }

    static std::string minToClock(int m) {
        m = (m % 1440 + 1440) % 1440;
        std::stringstream ss;
        ss << std::setw(2) << std::setfill('0') << (m / 60) << ":" 
           << std::setw(2) << std::setfill('0') << (m % 60);
        return ss.str();
    }
};

struct JourneyLeg {
    std::string train_num, train_name, train_type, from, to, link;
    int dep_abs, arr_abs, dep_day, arr_day;
    std::string dep_clock, arr_clock;
    std::vector<std::string> classes;

    JourneyLeg(const std::string &tn, const std::string &tname, const std::string &ty,
               const std::string &f, const std::string &t, const std::string &l,
               int d_abs, int a_abs, const std::vector<std::string> &cls)
        : train_num(tn), train_name(tname), train_type(ty), from(f), to(t), link(l),
          dep_abs(d_abs), arr_abs(a_abs), classes(cls) {
        dep_day = (d_abs / 1440) + 1;
        arr_day = (a_abs / 1440) + 1;
        dep_clock = Stop::minToClock(d_abs);
        arr_clock = Stop::minToClock(a_abs);
    }
};

struct JourneyResponse {
    std::string hash;
    std::vector<JourneyLeg> legs;
    int total_duration;

    static std::string generateHash(const std::vector<JourneyLeg> &legs) {
        std::stringstream ss;
        for (const auto &leg : legs) ss << leg.train_num << "|" << leg.from << "|" << leg.to << "|";
        return std::to_string(std::hash<std::string>{}(ss.str()));
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
    std::string train_number, train_name, type, link;
    std::vector<std::string> classes;
    std::vector<Stop> schedule;
    std::map<std::string, bool> operating_days;

    bool runsOn(int dayNum) {
        static std::vector<std::string> dNames = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"};
        std::string name = dNames[(dayNum - 1) % 7];
        return operating_days.count(name) && operating_days[name];
    }
};
#endif