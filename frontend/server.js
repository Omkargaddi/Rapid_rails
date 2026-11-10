import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "dist");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const target = () => (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

async function handleApiProxy(req, res) {
  const url = `${target()}${req.url}`;
  try {
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key !== "host") headers[key] = value;
    }
    if (!headers["x-request-id"]) {
      headers["x-request-id"] = crypto.randomUUID();
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const upstreamRes = await fetch(url, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    res.statusCode = upstreamRes.status;
    upstreamRes.headers.forEach((v, k) => {
      res.setHeader(k, v);
    });

    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch {
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { code: "API_UNAVAILABLE", message: "The routing service is unavailable. Please try again." } }));
  }
}

function handleStatic(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  let filePath = path.join(DIST_DIR, pathname);
  if (!filePath.startsWith(DIST_DIR)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  let stats;
  try {
    stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      stats = fs.statSync(filePath);
    }
  } catch {
    filePath = path.join(DIST_DIR, "index.html");
    try {
      stats = fs.statSync(filePath);
    } catch {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  if (pathname.startsWith("/assets/")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.setHeader("Cache-Control", "no-cache");
  }

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/")) {
    handleApiProxy(req, res);
  } else {
    handleStatic(req, res);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Frontend production server listening on http://${HOST}:${PORT}`);
});
