import express from "express";
import { z } from "zod";
import { EngineError } from "./services/engineClient.js";
import { StationService } from "./services/stationService.js";

const routeSchema = z.object({
  source: z.string().trim().min(1).max(8).transform((s) => s.toUpperCase()),
  destination: z.string().trim().min(1).max(8).transform((s) => s.toUpperCase()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be HH:MM (24h)"),
  limit: z.coerce.number().int().min(1).max(50).default(50),
  page: z.coerce.number().int().min(1).default(1),
  filters: z.object({
    max_duration_minutes: z.coerce.number().int().min(1).optional(),
    max_transfers: z.coerce.number().int().min(0).max(50).optional(),
    direct_only: z.boolean().optional(),
  }).default({}),
}).refine((r) => r.source !== r.destination, {
  message: "source and destination must differ",
  path: ["destination"],
});

export function createApp({ stations, routes, engine, corsOrigin }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(express.json({ limit: "16kb" }));

  // Request logger with timing
  app.use((req, res, next) => {
    const start = performance.now();
    res.on("finish", () => {
      const ms = Math.round((performance.now() - start) * 100) / 100;
      console.log(`${req.method} ${req.path} ${res.statusCode} - ${ms}ms`);
    });
    if (corsOrigin) {
      res.setHeader("access-control-allow-origin", corsOrigin);
      res.setHeader("access-control-allow-headers", "content-type");
      res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
      if (req.method === "OPTIONS") return res.sendStatus(204);
    }
    next();
  });

  const health = async (_req, res) => {
    let engineStatus = null;
    try {
      engineStatus = await engine.health();
    } catch (e) {
      console.warn(`Engine health check failed: ${e.message}`);
    }
    const healthy = engineStatus !== null && stations.size > 0;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "healthy" : "unhealthy",
      checks: {
        engine: engineStatus ? "up" : "down",
        stations: { count: stations.size, source: stations.source },
      },
      engine: engineStatus,
      uptime_s: Math.round(process.uptime()),
    });
  };
  app.get("/health", health);
  app.get("/api/health", health);

  // station search
  app.get("/api/stations", (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    res.json({ query: q, stations: stations.search(q, limit) });
  });


  app.get("/api/stations/:code", (req, res) => {
    const s = stations.get(req.params.code);
    if (!s) {
      return res.status(404).json({ error: { code: "STATION_NOT_FOUND", message: `unknown station code ${req.params.code}` } });
    }
    res.json({ ...StationService.hit(s), all_known_names: s.all_known_names || [] });
  });

  // route search
  app.post("/api/routes", async (req, res, next) => {
    try {
      const parsed = routeSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "invalid route request",
            details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
          },
        });
      }
      const q = parsed.data;
      if (!stations.get(q.source)) {
        return res.status(400).json({ error: { code: "UNKNOWN_STATION", message: `unknown source station code ${q.source}` } });
      }
      if (!stations.get(q.destination)) {
        return res.status(400).json({ error: { code: "UNKNOWN_STATION", message: `unknown destination station code ${q.destination}` } });
      }
      const body = await routes.search(q);
      res.json(body);
    } catch (e) {
      next(e);
    }
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "route not found" } });
  });

  // error handler
  app.use((err, _req, res, _next) => {
    if (err instanceof EngineError) {
      const status = err.kind === "invalid" ? 400 : err.kind === "overloaded" ? 429 : 503;
      return res.status(status).json({ error: { code: "ENGINE_ERROR", message: err.message } });
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ error: { code: "INTERNAL", message: "internal server error" } });
  });

  return app;
}
