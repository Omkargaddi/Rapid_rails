#include <iostream>
#include <fstream>
#include "json.hpp"
#include <bits/stdc++.h>
using json = nlohmann::json;
using namespace std;
namespace fs = std::filesystem;

int main(){
    cout << "Program started" << endl;

    string folder = "train_data";

    for(auto& entry : fs::directory_iterator(folder)){
        ifstream file(entry.path());
        if (!file.is_open()) {
            cout << "  Failed to open\n";
            continue;
        }
        json j;
        file >> j;
        string link = j["link"];
        string train_no = j["train_number"];
        string type = j["type"];
        string train_name = j["train_name"];
    }
    return 0;
}