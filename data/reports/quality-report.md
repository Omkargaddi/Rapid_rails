# Data quality report

Generated 2026-11-10T07:30:49.998Z from `/home/omkar_gaddi/Desktop/final_rapid_rails/train_data` with policy `correct`.

## Raw dataset
```json
{
  "files": 1725,
  "records": 1725,
  "unique_train_numbers": 1725,
  "unique_route_ids": 1725,
  "unique_station_codes": 2897,
  "total_stops": 30796,
  "stops_per_train": {
    "min": 2,
    "median": 17,
    "mean": 17.85,
    "max": 35
  },
  "day_of_journey": {
    "1": 15949,
    "2": 12740,
    "3": 1967,
    "4": 140
  },
  "types_raw": {
    "\"MAIL EXPRESS\"": 636,
    "\"SUPERFAST\"": 535,
    "\"MAIL EXPRESS \"": 139,
    "\"SUPERFAST \"": 126,
    "\"TRAIN ON DEMAND\"": 48,
    "\"JAN SHATABDI\"": 35,
    "\"GARIB RATH\"": 34,
    "\"DURONTO EXPRESS\"": 33,
    "\"PASSENGER\"": 26,
    "\"RAJDHANI\"": 21,
    "\"SHATABDI\"": 17,
    "\"TRAIN ON DEMAND \"": 17,
    "\"VANDE BHARAT\"": 10,
    "\"JAN SHATABDI \"": 6,
    "\"RAJDHANI \"": 6,
    "\"SHATABDI \"": 6,
    "\"DURONTO EXPRESS \"": 5,
    "\"GARIB RATH \"": 5,
    "\"AMRIT BHARAT\"": 3,
    "\"PASSENGER \"": 3,
    "\"DMU\"": 2,
    "\"PARCEL EXPRESS\"": 2,
    "\"SUBURBAN\"": 2,
    "\"TOURIST TRAIN\"": 2,
    "\"AMRIT BHARAT \"": 1,
    "\"INAUGURAL SPECIAL\"": 1,
    "\"MAGH MELA SPECIAL \"": 1,
    "\"MEMU \"": 1,
    "\"TEJAS\"": 1,
    "\"VANDE BHARAT \"": 1
  },
  "classes": {
    "3A": 1369,
    "SL": 1285,
    "2A": 1271,
    "GEN": 1193,
    "PWD": 957,
    "1A": 755,
    "3E": 582,
    "2S": 328,
    "CC": 291,
    "EC": 44,
    "EV": 19,
    "LDS": 8,
    "PC": 4,
    "VP": 4,
    "GAC": 2,
    "GFC": 2
  },
  "operating_days_per_week": {
    "1": 522,
    "2": 198,
    "3": 133,
    "4": 61,
    "5": 42,
    "6": 49,
    "7": 720
  },
  "extra_stop_keys": {
    "platform": 6213
  }
}
```
## After cleaning
```json
{
  "policy": "correct",
  "accepted_trains": 1725,
  "rejected_records": 0,
  "stations": 2894,
  "stations_served_by_one_train": 532,
  "boardable_stops": 30796,
  "placeholder_stops": 0,
  "types": {
    "MAIL EXPRESS": 775,
    "SUPERFAST": 661,
    "TRAIN ON DEMAND": 65,
    "JAN SHATABDI": 41,
    "GARIB RATH": 39,
    "DURONTO EXPRESS": 38,
    "PASSENGER": 29,
    "RAJDHANI": 27,
    "SHATABDI": 23,
    "VANDE BHARAT": 11,
    "AMRIT BHARAT": 4,
    "DMU": 2,
    "PARCEL EXPRESS": 2,
    "SUBURBAN": 2,
    "TOURIST TRAIN": 2,
    "INAUGURAL SPECIAL": 1,
    "MAGH MELA SPECIAL": 1,
    "MEMU": 1,
    "TEJAS": 1
  },
  "max_span_minutes": 4395,
  "top_stations": [
    "KYN:159",
    "CNB:154",
    "BSL:151",
    "HWH:136",
    "BRC:135",
    "ST:135",
    "BZA:128",
    "DDU:120",
    "PUNE:120",
    "NDLS:118",
    "BBS:116",
    "ET:113",
    "ASN:110",
    "ADI:109",
    "MMR:108"
  ]
}
```
## Issue counts
| code | count |
|---|---|
| CLASSES_EMPTY | 21 |
| CODE_RECOVERED_FROM_NAME | 5 |
| STATION_REPEATED_IN_TRAIN | 4 |
| NAME_SHARED_BY_CODES | 3 |
| STATION_NAME_VARIANTS | 3 |
| ZERO_MINUTE_HOP | 2 |
| LONG_DWELL | 1 |
| SHARED_TIMETABLE_DIFFERENT_DAYS | 1 |
| TRAIN_NUMBER_NONSTANDARD | 1 |

## Warnings and errors
- **warning** `LONG_DWELL` 08450 stop#1: 08450.json: dwell of 720 min at KON
- **warning** `CODE_RECOVERED_FROM_NAME` 11403 stop#22: 11403.json: station_code "Point(4)" replaced by MRJ taken from name "MIRAJ JN. MRJ Train Reversal"
- **warning** `CODE_RECOVERED_FROM_NAME` 11404 stop#16: 11404.json: station_code "Point(4)" replaced by AK taken from name "AKOLA JN. AK Train Reversal"
- **warning** `CODE_RECOVERED_FROM_NAME` 12516 stop#4: 12516.json: station_code "" replaced by LMG taken from name "LUMDING JN LMG Train Reversal"
- **warning** `CODE_RECOVERED_FROM_NAME` 19415 stop#28: 19415.json: station_code "Point(4)" replaced by ASR taken from name "AMRITSAR ASR Train Reversal"
- **warning** `CODE_RECOVERED_FROM_NAME` 19415 stop#30: 19415.json: station_code "Point(5)" replaced by PTK taken from name "PATHANKOT PTK Train Reversal"
- **warning** `STATION_NAME_VARIANTS` -: SWM: "SAWAI MADHOPUR JN"x68, "SAWAI MADHOPUR"x1; canonical "SAWAI MADHOPUR JN"
- **warning** `STATION_NAME_VARIANTS` -: MGR: "MONGHYR"x2, "PURATCHI THALAIVAR DR."x1; canonical "MONGHYR"
- **warning** `STATION_NAME_VARIANTS` -: BPR: "BHOJIPURA JN."x6, "BADARPUR JN."x1; canonical "BHOJIPURA JN."
