#ifndef STATIONMANAGER_HPP
#define STATIONMANAGER_HPP

#include "DataModels.hpp"
#include <unordered_map>
#include <vector>

class StationManager {
public:
    std::unordered_map<std::string, std::vector<Train*>> stationToTrains;

    void addTrainToStation(const std::string& code, Train* train) {
        if (code.empty()) return;
        auto& list = stationToTrains[code];
        for (auto ptr : list) if (ptr == train) return;
        list.push_back(train);
    }
};

#endif