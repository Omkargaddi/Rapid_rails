#pragma once
#include <bits/stdc++.h>
#include "json.hpp"
#include "router.h"
typedef long long ll;
typedef unsigned long long ull;
using namespace std;

namespace rail {

string compact_json(const Timetable& tt, const Query& q, const RouteResult& r, string worker);

nlohmann::json config_to_json(RouterConfig c);

}  // namespace rail
