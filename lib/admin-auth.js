import { NextResponse } from "next/server";

// Control-panel writes (queue a subject, pause/retry/delete it) are only for
// Jake, so they carry the shared ADMIN_TOKEN as a Bearer token. Deliberately a
// different secret from WORKER_TOKEN: the worker's token should never be able
// to drive the control panel, and vice versa.
//
// If ADMIN_TOKEN is not set in the environment this fails closed — no token
// configured means nobody is authorized, rather than everybody.
export function isAdminAuthorized(request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return Boolean(token) && token === expected;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
