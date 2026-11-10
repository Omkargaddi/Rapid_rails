# preprocess raw timetable JSON into the routing-optimized format.
FROM node:24-alpine AS data
WORKDIR /app
COPY scripts/ scripts/
COPY train_data/ train_data/
ARG CLEAN_POLICY=correct
RUN cd scripts && node preprocess.ts --raw ../train_data --policy "$CLEAN_POLICY"

# compile the engine.
FROM debian:trixie-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends g++ cmake make && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY routing-engine/ routing-engine/
COPY --from=data /app/data/processed/ data/processed/
RUN cmake -S routing-engine -B routing-engine/build -DCMAKE_BUILD_TYPE=Release \
 && cmake --build routing-engine/build -j"$(nproc)"

# minimal runtime.
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 engine
COPY --from=build /src/routing-engine/build/routing_engine /usr/local/bin/routing_engine
COPY --from=data /app/data/processed/timetable.json /data/timetable.json
ENV TIMETABLE_PATH=/data/timetable.json ENGINE_HOST=0.0.0.0 ENGINE_PORT=7070
USER engine
EXPOSE 7070 7071
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 CMD curl -fsS http://127.0.0.1:${ENGINE_PORT}/health || exit 1
ENTRYPOINT ["/usr/local/bin/routing_engine"]
