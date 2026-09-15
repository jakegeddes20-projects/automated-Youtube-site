import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSubjectWithEpisodes } from "../../../../lib/queries";
import { isWorkerAuthorized, unauthorized } from "../../../../lib/worker-auth";

// Claims the next queued subject for the worker. The UPDATE...WHERE id IN
// (SELECT ... FOR UPDATE SKIP LOCKED) form makes the claim atomic, so two
// workers polling at once can never take the same subject.
//
// The poll doubles as the idle heartbeat (one request instead of two — every
// request costs hosting credits), so the body may carry hostname/current_task.
//
// Returns the subject with any episodes already planned for it, so a retried
// subject can resume from the stage it failed at instead of starting over.
export async function POST(request) {
  if (!isWorkerAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  await db().sql`
    INSERT INTO worker_status (id, hostname, current_task, last_seen)
    VALUES (1, ${body.hostname ? String(body.hostname).slice(0, 100) : null},
            ${body.current_task ? String(body.current_task).slice(0, 300) : null}, NOW())
    ON CONFLICT (id) DO UPDATE
      SET hostname = EXCLUDED.hostname, current_task = EXCLUDED.current_task, last_seen = NOW()
  `;

  const [claimed] = await db().sql`
    UPDATE subjects
    SET status = 'researching', claimed_at = NOW(), error = NULL, updated_at = NOW()
    WHERE id = (
      SELECT id FROM subjects
      WHERE status = 'queued'
      ORDER BY position, id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `;

  if (!claimed) {
    return NextResponse.json({ subject: null });
  }

  const subject = await getSubjectWithEpisodes(claimed.id);
  return NextResponse.json({ subject });
}
