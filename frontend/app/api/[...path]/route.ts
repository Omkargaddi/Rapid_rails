import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const target = () => (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = `${target()}/api/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  try {
    const res = await fetch(url, {
      method: req.method,
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
        "x-request-id": req.headers.get("x-request-id") ?? crypto.randomUUID(),
      },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return new Response(res.body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ error: { code: "API_UNAVAILABLE", message: "The routing service is unavailable. Please try again." } }, { status: 503 });
  }
}

export { proxy as GET, proxy as POST };
