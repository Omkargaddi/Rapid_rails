#ifndef STATIONMANAGER_HPP
#define STATIONMANAGER_HPP
#include <vector>
#include <unordered_map>
#include "DataModels.hpp"
using namespace std;

class StationManager {
public:
    unordered_map<string,vector<Train*>> stationToTrains;

    void addTrainToStation(const string& code, Train* train) {
        if (code.empty()) return;
        auto& list = stationToTrains[code];
        for (auto ptr : list) if (ptr == train) return;
        list.push_back(train);
    }
};

#endif