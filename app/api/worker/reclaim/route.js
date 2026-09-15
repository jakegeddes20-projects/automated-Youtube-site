import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { addEvent } from "../../../../lib/queries";
import { isWorkerAuthorized, unauthorized } from "../../../../lib/worker-auth";

// Called once when the worker starts. There is only one worker, so any
// subject still marked as running at that moment was interrupted (PC crash,
// lost connection, closed window) and goes back in the queue to resume.
export async function POST(request) {
  if (!isWorkerAuthorized(request)) return unauthorized();

  const rows = await db().sql`
    UPDATE subjects SET status = 'queued', stage_detail = NULL, updated_at = NOW()
    WHERE status IN ('researching', 'planning', 'writing', 'voicing')
    RETURNING id
  `;
  await db().sql`
    UPDATE episodes SET voiceover_status = 'pending'
    WHERE voiceover_status = 'rendering'
  `;
  for (const row of rows) {
    await addEvent({ subjectId: row.id, level: "warn", message: "The PC worker restarted; resuming from the last finished step." });
  }
  return NextResponse.json({ requeued: rows.map((r) => r.id) });
}
