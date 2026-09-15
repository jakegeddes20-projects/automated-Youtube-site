import { NextResponse } from "next/server";

// Every /api/worker/* route is called only by the PC worker, which sends the
// shared WORKER_TOKEN as a Bearer token.
export function isWorkerAuthorized(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return Boolean(token) && token === process.env.WORKER_TOKEN;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
