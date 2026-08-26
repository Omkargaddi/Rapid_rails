#include "EngineCommon.hpp"

StationManager sm;
deque<Train> trains;

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