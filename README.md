# RapidRails - Train Route Optimization System

<p align="center">
<img width="550" height="159" alt="logo2" src="https://github.com/user-attachments/assets/1253fe89-ad5f-40bc-8942-f2a42d675d2a" />
</p>

## Problem Statement

Traditional train route planners face several limitations:

- Difficulty handling multi-leg journeys with multiple transfers
- Lack of realistic layover constraints
- Fragmented schedule data (PDFs, text files)
- Poor performance when traversing large multi-hop graphs

RapidRails solves these using:

- Optimized shortest-path algorithm

## Application Screenshots

### Route Search Interface

<p align="center">
<img width="1919" height="908" alt="image" src="https://github.com/user-attachments/assets/9a351b28-9bf8-4698-aeb7-d9ffc61d44d2" />
</p>

### Journey Results

<p align="center">
<img width="1919" height="908" alt="image" src="https://github.com/user-attachments/assets/b90f16e5-8303-47c9-bd9c-a5de6f89ee49" />
</p>

<p align="center">
<img width="1920" height="909" alt="image" src="https://github.com/user-attachments/assets/d006b8d2-2f78-4184-93c2-f2f0fc7db775" />
</p>

## Core Engine / Algorithm

RapidRails uses a **modified Dijkstra's Algorithm**. The routing engine is implemented in **C++17** for maximum performance and low-latency computations.

## Tech Stack

### Backend

- **C++ (C++17)** – High-performance routing engine (stdio sync engine + Redis queue worker)
- **Node.js / Express.js** – API layer (sync + async servers)
- **PostgreSQL** – User data & saved journeys (JSONB for journey legs)
- **Redis** – Route cache-aside + async job status + job queue (Redis Lists)
- **Nginx** – Reverse proxy, path-based load balancing, rate limiting
- **Docker Compose** – Local orchestration

### Frontend

- **React.js (Vite)**
- **Tailwind CSS**

## Architecture

```text
                         Client
                              |
                              v
                    +-------------------+
                    |      Nginx        |
                    |   (80 / 8080)     |
                    | Reverse proxy     |
                    | Rate limiting     |
                    | least_conn LB     |
                    +---------+---------+
                              |
              /api/*          |           /api/async/*
                 +------------+------------+
                 |                         |
                 v                         v
        +-----------------+         +-----------------+
        |  node-api-sync  |         |  node-api-async |
        |  (spawns C++)   |         |  (queues jobs)  |
        +-----------------+         +-----------------+
                 |                         |
          sync Dijkstra              RPUSH -> Redis queue
                 |                         |
                 |                         v
                 |                  +--------------+  +--------------+
                 |                  | cpp-worker-1 |  | cpp-worker-2 |
                 |                  |  (BRPOP)     |  |  (BRPOP)     |
                 |                  +--------------+  +--------------+
                 |                         |
                 v                         v
        +-----------------+         +-----------------+
        |   PostgreSQL    |<--------|     Redis       |
        |  users/favs     |         | cache+queue+jobs|
        +-----------------+         +-----------------+
```

### Request Flow

- **Synchronous** (`POST /api/sync/search`): the request stays open while the Node server runs the C++ Dijkstra engine (spawned child process, newline-delimited JSON over stdio). Results are cached in Redis (cache-aside) keyed by route parameters.
- **Asynchronous** (`POST /api/async/search`): the API returns `202 + jobId` immediately after pushing the job onto a Redis list. C++ workers `BRPOP` the list, compute the route, and write the result to `job:{jobId}` (TTL 10 min). Clients poll `GET /api/async/status/:jobId`.

### Graceful Degradation

If the Redis queue length reaches `QUEUE_MAX_DEPTH` (default 1000), new async jobs are rejected with **503 "High demand. Please retry shortly."** instead of accepting unbounded work.

## Getting Started

### Prerequisites

- Docker + Docker Compose

### Run the Full Stack

```bash
docker compose up -d --build
```

Services:

| Service | Port | Purpose |
|---|---|---|
| nginx | 8080 | Reverse proxy / load balancer |
| node-api-sync | internal | Auth + favorites + `/api/sync/search` |
| node-api-async | internal | `/api/async/search` + `/api/async/status/:jobId` |
| cpp-worker (×2) | internal | Consumes jobs, runs Dijkstra |
| postgres | internal | Users + favorites |
| redis | internal | Cache + queue + job status |

### Run Locally Without Docker

```bash
cd train-backend
npm install
cd cpp_src && make -B        # build train_engine + train_worker
cd ..
node server.js               # all-in-one dev server (sync + async + auth)
```

Requires PostgreSQL and Redis running locally (see `train-backend/.env`).

### Environment Variables (`train-backend/.env`)

```env
PORT=3000
DATABASE_URL=postgres://postgres:rapidrails@localhost:5432/rapidrails
REDIS_URL=redis://localhost:6379
JWT_SECRET=<change-me>
QUEUE_NAME=route_jobs
QUEUE_MAX_DEPTH=1000
JOB_TTL_SECONDS=600
CACHE_TTL_SECONDS=86400
SMTP_HOST=smtp.gmail.com
SMTP_USER=
SMTP_PASS=
```

## API Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/register` | – | Create account |
| POST | `/api/login` | – | Login → JWT |
| POST | `/api/forgot-password` | – | Send reset code |
| POST | `/api/verify-reset-code` | – | Reset password |
| POST | `/api/sync/search` | ✓ | Synchronous route search |
| POST | `/api/async/search` | ✓ | Async route search → `202 {jobId}` |
| GET | `/api/async/status/:jobId` | ✓ | Poll async job status/results |
| GET | `/api/async/queue-depth` | ✓ | Current queue length |
| POST | `/api/fav-add` | ✓ | Save journey |
| DELETE | `/api/fav-delete/:hash` | ✓ | Remove journey |
| GET | `/api/favorites` | ✓ | List saved journeys |

### Async Lifecycle

```text
queued ──> processing ──> complete | failed
```

Job status is stored in Redis under `job:{jobId}` with a 10-minute TTL.

## Scaling the C++ Workers

```bash
docker compose up -d --scale cpp-worker=4
```

Workers share the Redis queue via `BRPOP`, so jobs are distributed automatically. Each worker loads the full train schedule (~1725 trains) into memory.
