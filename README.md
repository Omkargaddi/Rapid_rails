# RapidRails 🚆  
**High-Performance Train Route Optimization System**

RapidRails is a full-stack, routing platform designed to compute **complex multi-leg railway journeys** with realistic transfer constraints.  
It leverages a **high-performance C++ in-memory graph engine** to deliver at scale.

---

## 🚀 Problem Statement

Conventional train search systems struggle with:
- Multi-leg journeys involving several transfers
- Realistic layover constraints between trains
- Fragmented schedule data (text / PDFs)
- Poor performance when traversing multi-hop connections

RapidRails solves these challenges by combining **time-expanded graph modeling**, **buffer-aware routing**, and a **distributed microservices architecture**.

---

## 🧠 Key Features

- **Multi-Leg Route Optimization**  
  Computes end-to-end journeys across multiple trains with optimal transfers.

- **Buffer-Aware Routing**  
  Enforces user-defined minimum and maximum transfer windows (e.g., 45 minutes – 8 hours).

- **Multiple Search Preferences**  
  Supports *Fastest* and *Convenient* routing modes based on user priorities.

- **Secure Authentication**  
  JWT-based authentication allowing users to save and manage journey history.

---

## 🧠 Technical Overview: Graph Search Engine

The core of RapidRails is a **high-performance C++ Graph Engine** designed to solve the  
**Multi-Modal Connection Problem** for railway networks.

Unlike traditional static graphs, the engine operates on a **time-expanded representation** of train schedules, ensuring all computed transfers are **physically feasible in real time**.

---

### 🔍 Search Algorithms

The engine uses a **modified Dijkstra’s Algorithm** with custom priority queue comparators to support multiple routing strategies:

#### 1. Fastest Path
- Minimizes **total journey duration** (Arrival Time − Departure Time)
- Prioritizes speed over number of transfers
- Ideal for time-sensitive travel

#### 2. Convenient Path
- Uses a weighted cost function to penalize excessive transfers and waiting time:
- Effectively filters out “hectic” routes with too many changes
- Balances comfort and efficiency

### ⚙️ Core Engine Features & Constraints

- **Time-Expanded Graph**  
  Each train instance is modeled as a unique temporal edge, ensuring transfer feasibility based on exact arrival and departure times.

- **Buffer Management**  
  Supports `min_buffer` and `max_buffer` constraints to enforce realistic layover durations at connection stations.

- **Weekly Scheduling Support**  
  Automatically identifies the next valid operating day for trains that do not run daily, ensuring accurate handling of weekly and bi-weekly services.

- **Path Reconstruction**  
  Uses a pointer-based state tree to reconstruct full journey details, including:
  - Train numbers
  - Station codes
  - Absolute timestamps

---

### ⚡ Optimization & Performance

To maintain low latency across thousands of schedules, the engine applies several optimizations:

- **State Pruning**  
  A `VisitKey` system *(Station + Legs + Start Time)* prevents re-exploration of suboptimal paths, significantly reducing search space.

- **Expansion Limits**  
  Search is capped at **100,000 state expansions**, guaranteeing sub-second response times even for cross-country queries.

- **Memory Efficiency**  
  - Uses `std::unordered_map` with custom hash functions for **O(1)** lookups  
  - Lightweight state structures minimize heap allocations during search

---

## 🏗️ System Architecture

Frontend (React + Tailwind, Netlify HTTPS)\
             |\
             | api\
             v\
Backend (Node.js + Express, GCP VM)\
             |\
             | Private REST API\
             v\
Routing Engine (C++17 In-Memory Graph)\


---

## 🧩 Tech Stack

### Backend
- **C++ (17)** – High-performance routing engine  
- **Node.js, Express** – API orchestration  
- **MongoDB** – User profiles and saved journey   

### Frontend
- **React**
- **Tailwind CSS**

### Infrastructure
- **Google Cloud Compute Engine**
- **Nginx (Reverse Proxy)**
- **Netlify (Frontend Hosting & API Proxy)**

### Libraries
- `cpp-httplib`, `nlohmann/json` (C++)
- `jsonwebtoken`, `bcrypt` (Node.js)

---

## ⚡ Performance Summary

- **Sub-10ms** route computation for multi-leg journeys  
- **7,000+ stations** represented in memory  
- **2,000+ train schedules** consolidated  
- **95% faster** than recursive relational database queries  

---

## 🔐 Security

- JWT-based stateless authentication
- Private networking between backend and C++ engine
- No external exposure of routing engine
- HTTPS-enabled frontend via Netlify

---

## 📄 License

This project is open for educational and demonstration purposes.


