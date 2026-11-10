export class EngineError extends Error {
  constructor(message, status, kind) {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

export class HttpRoutingEngine {
  constructor(baseUrl, timeoutMs = 5000) {
    this.baseUrl = (baseUrl || "http://127.0.0.1:7070").replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  async route(query) {
    const signal = AbortSignal.timeout(this.timeoutMs);
    let res;
    try {
      res = await fetch(`${this.baseUrl}/route`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(query),
        signal,
      });
    } catch (e) {
      throw new EngineError(`routing engine unreachable: ${e.message}`, 503, "unavailable");
    }

    const body = await res.json().catch(() => null);
    if (res.status === 400) {
      throw new EngineError(body?.error || "invalid query", 400, "invalid");
    }
    if (!res.ok || !body) {
      throw new EngineError(`routing engine error (HTTP ${res.status})`, 502, "unavailable");
    }
    return body;
  }

  async health() {
    const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(`engine health HTTP ${res.status}`);
    return await res.json();
  }
}
