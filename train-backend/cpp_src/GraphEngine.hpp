#ifndef GRAPHENGINE_HPP
#define GRAPHENGINE_HPP

#include "DataModels.hpp"
#include "StationManager.hpp"
#include <cmath>
#include <iostream>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <vector>

class GraphEngine{
  struct State{
    string station;
    int absolute_time;
    int legs;
    vector<JourneyLeg> path;

    bool operator>(const State &other) const{
      if(absolute_time != other.absolute_time)
        return absolute_time > other.absolute_time;
      return legs > other.legs;
    }
  };

  static int floorDiv(int a, int b){
    int res = a / b;
    int rem = a % b;
    if(rem != 0 &&((a < 0) ^(b < 0))){
      res--;
    }
    return res;
  }

public:
  static vector<JourneyResponse> convenient(StationManager &sm,const string &src,const string &dst, int day,int minB, int maxB, int maxLegs){
    vector<JourneyResponse> results;
    if(src == dst || maxLegs < 1)return results;

    unordered_map<string, vector<vector<int>>> best_times;
    priority_queue<State, vector<State>, greater<State>> pq;

    int start_time =(day - 1) * 1440;

    pq.push({src, start_time, 0,{}});
    const int MAX_RESULTS = 20;

    while(!pq.empty()){
      State curr = pq.top();
      pq.pop();

        if(curr.station == dst){
            JourneyResponse res;
            res.legs = curr.path;
            res.hash = JourneyResponse::generateHash(curr.path);
            res.total_duration = curr.path.empty() ? 0 :(curr.path.back().arr_abs - curr.path.front().dep_abs);

            bool exists = false;
            for(const auto &r : results){
                if(r.hash == res.hash){
                    exists = true;
                    break;
                }
            }
            if(!exists){
                results.push_back(res);
                if(results.size() >= MAX_RESULTS)break;
            }
            continue;
      }
      if(curr.legs >= maxLegs)continue;
      auto trains_it = sm.stationToTrains.find(curr.station);
      if(trains_it == sm.stationToTrains.end())continue;

      for(Train *train : trains_it->second){
        int idx = -1;
        for(int i = 0; i <(int)train->schedule.size(); i++){
          if(train->schedule[i].station_code == curr.station){
            if(train->schedule[i].departure_minutes != -1){
              idx = i;
            }
            break;
          }
        }
        if(idx == -1)continue;

        int T = curr.absolute_time;
        int required_min_dep =(curr.legs == 0) ? T : T + minB;
        int required_max_dep =(curr.legs == 0) ? T + 1440 : T + maxB;

        int M = train->schedule[idx].departure_minutes;
        int diff = required_min_dep - M;
        int K = floorDiv(diff, 1440);
        if(K * 1440 + M < required_min_dep){
            K++;
        }

        bool found_day = false;
        int best_K = -1;
        for(int i = 0; i < 7; i++){
          int test_K = K + i;
          int dep_abs = test_K * 1440 + M;

          if(dep_abs > required_max_dep){
            break;
          } 

          int mod_day =((test_K % 7) + 7) % 7;
          int day_for_runsOn = mod_day + 1;

          if(train->runsOn(day_for_runsOn)){
              found_day = true;
              best_K = test_K;
              break;
            }
        }

        if(!found_day)continue;

        int actual_dep_abs = best_K * 1440 + M;

        for(int i = idx + 1; i <(int)train->schedule.size(); i++){
          const Stop &alight_stop = train->schedule[i];
          if(alight_stop.arrival_minutes == -1)
            continue;

          int actual_arr_abs = best_K * 1440 + alight_stop.arrival_minutes;
          string nxt_stations = alight_stop.station_code;

          bool cycle = false;
          for(auto &leg : curr.path){
            if(leg.from == nxt_stations || leg.to == nxt_stations){
              cycle = true;
              break;
            }
          }
          if(cycle)continue;

          int next_legs = curr.legs + 1;

          if(best_times.find(nxt_stations) == best_times.end()){
              best_times[nxt_stations].resize(maxLegs + 1);
          }
          bool prune = false;
          const int MAXK = 4;
          if(best_times[nxt_stations][next_legs].size() >= MAXK){
              prune = true;
          } else{
              for(int l = 0; l < next_legs; l++){
                  if(!best_times[nxt_stations][l].empty()){
                      int best_fewer_legs = best_times[nxt_stations][l][0];
                      if(actual_arr_abs > best_fewer_legs + 720){
                          prune = true;
                          break;
                      }
                  }
              }
          }
          if(!prune){
              best_times[nxt_stations][next_legs].push_back(actual_arr_abs);
              State next_state = curr;
              next_state.station = nxt_stations;
              next_state.absolute_time = actual_arr_abs;
              next_state.legs = next_legs;
              
              next_state.path.emplace_back(
                  train->train_number, train->train_name, train->type,
                  curr.station, nxt_stations, train->link,
                  actual_dep_abs, actual_arr_abs, train->classes
              );

              pq.push(next_state);
          }
      }
    }
}
    return results;
  }
};

#endif