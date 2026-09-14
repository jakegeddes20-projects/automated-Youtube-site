import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

function isAuthorized(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return token && token === process.env.WORKER_TOKEN;
}

// Polled by the GPU worker script to find scripts that are ready for
// voice-over generation but haven't been narrated yet.
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const database = db();
  const jobs = await database.sql`
    SELECT id, topic, script FROM jobs
    WHERE status = 'script_ready' AND voiceover_status = 'pending'
    ORDER BY created_at ASC
    LIMIT 5
  `;

  return NextResponse.json({ jobs });
}