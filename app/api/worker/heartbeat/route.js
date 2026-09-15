import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { isWorkerAuthorized, unauthorized } from "../../../../lib/worker-auth";

// The PC worker pings this every few seconds. The dashboard's online/offline
// pill is derived from how long ago the last ping arrived.
export async function POST(request) {
  if (!isWorkerAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const hostname = body.hostname ? String(body.hostname).slice(0, 100) : null;
  const task = body.current_task ? String(body.current_task).slice(0, 300) : null;

  await db().sql`
    INSERT INTO worker_status (id, hostname, current_task, last_seen)
    VALUES (1, ${hostname}, ${task}, NOW())
    ON CONFLICT (id) DO UPDATE
      SET hostname = EXCLUDED.hostname,
          current_task = EXCLUDED.current_task,
          last_seen = NOW()
  `;

  return NextResponse.json({ ok: true });
}
