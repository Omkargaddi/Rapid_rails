import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { HttpRoutingEngine } from "./services/engineClient.js";
import { JourneyRenderer } from "./services/journeyRenderer.js";
import { RouteService } from "./services/routeService.js";
import { loadStationsFromFile, StationService } from "./services/stationService.js";

const config = loadConfig();

console.log("Starting API server...");

// load stations
const stations = new StationService();
stations.load(await loadStationsFromFile(config.stationsFile), "file");
console.log(`Loaded ${stations.size} stations from ${config.stationsFile}`);

// load timetable
const renderer = JourneyRenderer.fromFile(config.timetablePath);
console.log(`Loaded timetable from ${config.timetablePath} (hash: ${renderer.hash})`);

// setup engine & route services
const engine = new HttpRoutingEngine(config.engineUrl);
const routes = new RouteService(engine, stations, renderer, config.maxResults);


const app = createApp({
  stations,
  routes,
  engine,
  corsOrigin: config.corsOrigin,
});

const server = app.listen(config.port, config.host, () => {
  console.log(`API listening on http://${config.host}:${config.port}`);
});

server.keepAliveTimeout = 65_000;

const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
