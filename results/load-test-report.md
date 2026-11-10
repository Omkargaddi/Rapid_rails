# Load-testing report

Controlled capacity study of the distributed routing stack on AWS. The goal was measurement, not a
production deployment: how far the system scales, where the bottlenecks sit, and how it behaves under
failure.

Of the seventeen experiments originally planned, the five that carried the design decisions are reported
here; the rest were dropped.

## Environment and method

- **Hardware**: 10 × m7i-flex.large (2 vCPU = 1 physical core with HT, 8 GB) in one VPC and cluster
  placement group: node01–08 engine workers, node09 nginx + Node API, node10 Redis + Prometheus + Grafana.
  k6 ran from a separate instance in a second AWS account. MongoDB was not deployed; the API serves the
  station master from a file.
- **Engine workers**: one single-core C++ process per vCPU, cpuset-pinned, ~100 MB resident timetable,
  graceful drain on SIGTERM, `X-Inflight` reported on every reply.
- **SLO**: p99 < 500 ms and errors < 0.1 %, measured at the client (k6; 429 counts as an error).
- **Capacity rule**: a breakpoint run ramps the arrival rate for 5 min; capacity is the highest achieved
  RPS before the SLO is broken for two consecutive 5 s steps (API windowed p99, client status codes),
  after 30 s of warm-up.
- **Repeats**: 3 per variant (median reported). Repeats agreed within ~10 % unless flagged.
- **Layouts**: the default layout (16 workers, 1 API process on node09) is used where noted; after
  experiment 2 the study runs on **2 API hosts × 2 Node processes with 14 workers** (`gw2-cluster2`).

---

## 1. Worker count scaling

**Question.** How does the maximum RPS within the SLO grow with 1–16 workers, and where does it stop
being linear?

**Setup.** Uniform random queries (each request distinct, ~70 % of station pairs have a route), one API
process on the gateway host, 5 min breakpoint ramp.

| Workers | Capacity (RPS) | Per worker | Efficiency vs 1 worker | Gain per added worker |
|---|---|---|---|---|
| 1 | 33 | 33.1 | 100 % | – |
| 2 | 124 | 62.2 | 188 % | 91 |
| 4 | 236 | 58.9 | 178 % | 56 |
| 8 | 431 | 53.9 | 163 % | 49 |
| 12 | 565 | 47.1 | 142 % | 34 |
| 16 | 570 | 35.6 | 108 % | 1.3 |

**USL fit** — X(N) = λN / (1 + σ(N − 1) + κN(N − 1)):

| Points | λ (RPS/worker) | σ (contention) | κ (coherency) | R² | Predicted peak N* |
|---|---|---|---|---|---|
| All 6 | 63.2 | 0.0000 | 0.00304 | 0.9933 | 18.1 |
| N ≤ 8 (one worker per physical core) | 59 | 0.0000 | 0.00166 | 0.9917 | 24.5 |

![Capacity by worker count](E1-capacity.svg)

![USL fit](E1-usl.svg)

**Findings.**

- Scaling is near-linear to 8 workers — one worker per physical core, no contention term.
- Past 8, per-worker efficiency erodes (coherency cost, κ): two HT siblings share one physical core and
  its L3 cache. The USL predicts the peak at ~18 workers on this hardware.
- The 12→16 step adds only 1.3 RPS per worker: by then the **single Node API process is the wall**, not
  the workers. Scaling workers further only makes sense together with the API tier — that is experiment 2.
- Error rates stayed ≤ 0.2 % and truncated searches ~2.5 % across all variants (per-query budget, not
  overload).

## 2. API tier scaling

**Question.** When does the bottleneck move from the engine workers to the Node tier, and which split of
the 10 hosts between API and workers gives the most capacity?

**Setup.** Breakpoint ramp, uniform queries. Each extra API host is taken from the end of the worker
hosts, so API hosts + worker hosts stay within the 10-instance budget: 1 API host = 16 workers,
2 = 14, 3 = 12, 4 = 10. × 1 or 2 Node processes per API host.

| API hosts × processes | Workers | Capacity (RPS) | Note |
|---|---|---|---|
| 1 × 1 | 16 | 637 | Node is the wall |
| 1 × 2 | 16 | 723 | |
| 2 × 1 | 14 | ≥ 861 | ramp ceiling reached |
| 2 × 2 | 14 | **1,108** | best overall |
| 3 × 1 | 12 | ≥ 861 | ceiling reached |
| 3 × 2 | 12 | ≥ 859 | ceiling reached |
| 4 × 1 | 10 | 728 | too few workers left |
| 4 × 2 | 10 | 310 | unstable (CV 44 %) |

![Capacity by API layout](E8-capacity.svg)

**Findings.**

- A single Node process caps the whole system at ~640–720 RPS no matter how many workers sit behind it —
  the bottleneck had moved from the engine tier to the API tier.
- **2 API hosts × 2 processes with 14 workers is the peak: 1,108 RPS.** Beyond that, each API host costs
  two worker hosts, and the lost engine capacity outweighs the API gain.
- This layout — `gw2-cluster2` — was chosen up front as the study configuration for all later
  experiments.

## 3. Payload cost

**Question.** How much does the rendered page size (10 vs 50 journeys) and gzip at nginx cost in capacity
and CPU? The API renders the engine's compact result; rendering is expected to dominate API CPU.

**Setup.** Breakpoint ramp on `gw2-cluster2` (capacity ~1,100 RPS), page limit 10 or 50, gzip on/off.

| Variant | Capacity (RPS) | API CPU (cores) | nginx CPU (cores) |
|---|---|---|---|
| 10 journeys, gzip off | 1,031 | 2.53 | 0.14 |
| 10 journeys, gzip on | 1,000 | 2.43 | 0.45 |
| 50 journeys, gzip off | 449 | 2.51 | 0.12 |
| 50 journeys, gzip on | 291 | 1.32 | 0.39 |

![Capacity by page size and gzip](E9-capacity.svg)

**Findings.**

- Rendering dominates: asking for 50 journeys instead of 10 more than **halves** capacity (1,031 → 449
  RPS), because each response renders 5× the journeys on the same API CPU.
- gzip moves work from the API to nginx and, at these payload sizes, *reduces* capacity (1,031 → 1,000,
  449 → 291 RPS). It would pay off only at much larger payloads. Kept **off**.

## 4. Failure injection

**Question.** What happens when workers or Redis die mid-run — detection time, error burst, recovery?
`kill8` removes 8 of 14 workers (57 % of capacity) under a 60 % load (~140 % of what remains).

**Setup.** Fixed 660 RPS for 5 min on `gw2-cluster2`; SIGKILL at 60 s, restart at 180 s. Health checks
run against each worker's separate admin port every 2 s; a worker is ejected after 3 consecutive
failures; dead requests retry on another worker.

| Variant | Detection | Failed requests | p99 back under SLO after | Worst windowed p99 | Errors |
|---|---|---|---|---|---|
| kill 1 worker | 5 s | 0 | immediately | 222 ms | 0 % |
| kill 4 workers | 5 s | 13 | immediately | 217 ms | 0 % |
| kill 8 of 14 | 5 s | 4,952 | 155 s | 4,710 ms | 3.1 % |
| kill Redis | n/a — fails open | 0 | immediately | 238 ms | 0 % |

![p99 under failure](E13-p99.svg)

**Findings.**

- Detection and ejection take ~5 s in every case.
- Losing 1 or 4 of 14 workers is absorbed invisibly: retries cover the gap and the SLO never breaks.
- Losing 8 breaks the SLO — ~5k failed requests (mostly 429s from the admission queue, 3.1 % error rate)
  and 155 s to recover after restart — but the system keeps serving the majority of traffic throughout.
- Redis loss **fails open** by design: 159,949 cache errors counted, every search recomputed on the
  engines, zero failed requests, p50 latency merely doubles (26 ms vs 13 ms).

## 5. K and label budget

**Question.** What does raising `TOP_K` (10/20/50) and the per-query work budget `MAX_LABELS`
(200k/500k) cost in capacity, and what does it buy in result completeness (`search_complete` rate)?

**Setup.** Breakpoint ramp on `gw2-cluster2`.

| TOP_K | MAX_LABELS | Capacity (RPS) | search_complete | Engine CPU (cores) |
|---|---|---|---|---|
| 10 | 200k | 1,442 | 99.4 % | 4.2 |
| 10 | 500k | 1,461 | 99.6 % | 4.7 |
| 20 | 200k | 1,450 | 98.5 % | 5.6 |
| 20 | 500k | 1,427 | 99.2 % | 6.4 |
| 50 | 200k | 1,277 | 94.8 % | 9.7 |
| 50 | 500k | 1,058 | 97.5 % | 10.5 |

![Capacity by K and label budget](E15-capacity.svg)

**Findings.**

- K = 10 → 20 is nearly free (~1,450 RPS either way). K = 50 costs real capacity: each search occupies a
  single-core worker up to ~2× longer (engine CPU 4.2 → 10.5 cores), so capacity drops to ~1,060–1,280 RPS.
- Raising the label budget buys completeness only at K = 50 (94.8 % → 97.5 %) and costs a further
  ~17 % of capacity.
- The deployed default (K = 50, 500k budget) is the completeness-first choice; K = 20 / 200k would serve
  ~35 % more traffic at 98.5 % completeness if capacity ever mattered more.

---

## Summary

| Decision | Result |
|---|---|
| Worker tier | Near-linear to 8 single-core workers; USL peak ~18; scale API and workers together |
| Layout | **2 API hosts × 2 Node processes, 14 pinned workers → 1,108 RPS within the SLO** |
| gzip | Off (costs capacity at these payload sizes) |
| Failover | ~5 s detection; loss of ≤ 4/14 workers is client-invisible; Redis fails open |
| K / budget | K = 50, 500k labels = completeness-first; K = 20, 200k = +35 % capacity |

The chosen configuration serves ~1,100 RPS within a p99 < 500 ms, errors < 0.1 % SLO, degrades
gracefully through a 57 % worker loss, and never serves stale or wrong results: the engine's top-K is
exact by construction, verified against a brute-force oracle on ~22,700 queries.
