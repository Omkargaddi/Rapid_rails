#pragma once
#include <bits/stdc++.h>
typedef long long ll;
typedef unsigned long long ull;
using namespace std;

namespace rail {


inline ll days_from_civil(ll y, ll m, ll d) {
  if (m <= 2) {
    y--;
  }

  ll era = 0;
  if (y >= 0) {
    era = y / 400;
  } else {
    era = (y - 399) / 400;
  }

  ll yoe = y - era * 400;

  ll m_offset = 0;
  if (m > 2) {
    m_offset = m - 3;
  } else {
    m_offset = m + 9;
  }

  ll doy = (153 * m_offset + 2) / 5 + d - 1;
  ll doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + doe - 719468;
}

struct Civil {
  ll y;
  ll m;
  ll d;
};

inline Civil civil_from_days(ll z) {
  z += 719468;

  ll era = 0;
  if (z >= 0) {
    era = z / 146097;
  } else {
    era = (z - 146096) / 146097;
  }

  ll doe = z - era * 146097;
  ll yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
  ll y = yoe + era * 400;
  ll doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
  ll mp = (5 * doy + 2) / 153;
  ll d = doy - (153 * mp + 2) / 5 + 1;

  ll m = 0;
  if (mp < 10) {
    m = mp + 3;
  } else {
    m = mp - 9;
  }

  if (m <= 2) {
    y++;
  }

  return {y, m, d};
}

inline ll weekday(ll day_index) {
  ll w = (day_index + 4) % 7;
  if (w < 0) {
    w += 7;
  }
  return w;
}

inline ll floor_div(ll a, ll b) {
  ll res = a / b;
  ll rem = a % b;
  if (rem != 0) {
    if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
      res = res - 1;
    }
  }
  return res;
}

// "YYYY-MM-DD" -> day index; validates the calendar date.
inline optional<ll> parse_date(string_view s) {
  if (s.size() != 10) {
    return nullopt;
  }
  if (s[4] != '-' || s[7] != '-') {
    return nullopt;
  }

  for (ll i = 0; i < 10; ++i) {
    if (i == 4 || i == 7) {
      continue;
    }
    if (s[i] < '0' || s[i] > '9') {
      return nullopt;
    }
  }

  ll y = (s[0] - '0') * 1000 + (s[1] - '0') * 100 + (s[2] - '0') * 10 + (s[3] - '0');
  ll m = (s[5] - '0') * 10 + (s[6] - '0');
  ll d = (s[8] - '0') * 10 + (s[9] - '0');

  if (m < 1 || m > 12) {
    return nullopt;
  }
  if (d < 1 || d > 31) {
    return nullopt;
  }

  ll idx = days_from_civil(y, m, d);
  Civil back = civil_from_days(idx);
  if (back.y != y || back.m != m || back.d != d) {
    return nullopt;
  }
  return idx;
}

// "HH:MM" -> minute of day.
inline optional<ll> parse_hhmm(string_view s) {
  if (s.size() != 5) {
    return nullopt;
  }
  if (s[2] != ':') {
    return nullopt;
  }

  if (s[0] < '0' || s[0] > '9' || s[1] < '0' || s[1] > '9') {
    return nullopt;
  }
  if (s[3] < '0' || s[3] > '9' || s[4] < '0' || s[4] > '9') {
    return nullopt;
  }

  ll h = (s[0] - '0') * 10 + (s[1] - '0');
  ll m = (s[3] - '0') * 10 + (s[4] - '0');

  if (h > 23 || m > 59) {
    return nullopt;
  }
  return h * 60 + m;
}

// absolute minutes -> "YYYY-MM-DDTHH:MM:00"
inline string format_datetime(ll abs_min) {
  ll day = floor_div(abs_min, 1440);
  ll mod = abs_min - day * 1440;
  Civil c = civil_from_days(day);
  char buf[32];
  snprintf(buf, sizeof buf, "%04lld-%02lld-%02lldT%02lld:%02lld:00",
           (long long)c.y, (long long)c.m, (long long)c.d,
           (long long)(mod / 60), (long long)(mod % 60));
  return string(buf);
}

inline string format_date(ll day) {
  Civil c = civil_from_days(day);
  char buf[16];
  snprintf(buf, sizeof buf, "%04lld-%02lld-%02lld",
           (long long)c.y, (long long)c.m, (long long)c.d);
  return string(buf);
}

}  // namespace rail
