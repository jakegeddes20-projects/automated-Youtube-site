import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { isAdminAuthorized, unauthorized } from "../../../../../lib/admin-auth";
import { db } from "../../../../../lib/db";
import { VOICES } from "../../../../../lib/options";
import { addEvent, getWorkerStatus, parseId } from "../../../../../lib/queries";

const RUNNING = ["researching", "planning", "writing", "voicing", "producing"];

// Queue controls from the dashboard: pause, resume, cancel, retry, move up,
// delete. The worker never fights these — it re-reads the subject between
// stages (and between chapters) and stops when it sees paused/cancelled.
// All of these change the queue (and retry/rerecord spend money on the PC),
// so they need the ADMIN_TOKEN Bearer token.
export async function POST(request, { params }) {
  if (!isAdminAuthorized(request)) return unauthorized();

  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const database = db();

  const [subject] = await database.sql`SELECT id, status, position FROM subjects WHERE id = ${id}`;
  if (!subject) return NextResponse.json({ error: "not found" }, { status: 404 });

  const fail = (msg) => NextResponse.json({ error: msg }, { status: 409 });

  switch (action) {
    case "pause": {
      if (subject.status !== "queued" && !RUNNING.includes(subject.status)) {
        return fail("Only a queued or running subject can be paused.");
      }
      await database.sql`UPDATE subjects SET status = 'paused', updated_at = NOW() WHERE id = ${subject.id}`;
      await addEvent({ subjectId: subject.id, message: "Paused from the dashboard." });
      break;
    }
    case "resume": {
      if (subject.status !== "paused") return fail("Only a paused subject can be resumed.");
      await database.sql`UPDATE subjects SET status = 'queued', updated_at = NOW() WHERE id = ${subject.id}`;
      await addEvent({ subjectId: subject.id, message: "Resumed — back in the queue." });
      break;
    }
    case "cancel": {
      if (subject.status === "done" || subject.status === "cancelled") {
        return fail("This subject is already finished.");
      }
      await database.sql`UPDATE subjects SET status = 'cancelled', finished_at = NOW(), updated_at = NOW() WHERE id = ${subject.id}`;
      await addEvent({ subjectId: subject.id, message: "Cancelled from the dashboard." });
      break;
    }
    case "retry": {
      // A subject that looks "running" while the PC is offline was interrupted
      // (crash, lost connection); allow it to be re-queued from here too.
      // A finished subject can be re-run too: the worker skips every stage
      // that is already done, so this only fills in stages added since
      // (e.g. the video and review for an older episode).
      const stuck = RUNNING.includes(subject.status) && !(await getWorkerStatus()).online;
      if (!["failed", "cancelled", "done"].includes(subject.status) && !stuck) {
        return fail("Only a failed, cancelled, finished or interrupted subject can be re-run.");
      }
      await database.sql`
        UPDATE subjects SET status = 'queued', error = NULL, stage_detail = NULL,
          finished_at = NULL, updated_at = NOW()
        WHERE id = ${subject.id}
      `;
      await database.sql`
        UPDATE episodes SET error = NULL,
          script_status = CASE WHEN script_status IN ('failed', 'writing') THEN 'pending' ELSE script_status END,
          voiceover_status = CASE WHEN voiceover_status IN ('failed', 'rendering') THEN 'pending' ELSE voiceover_status END,
          video_status = CASE WHEN video_status IN ('failed', 'producing') THEN 'pending' ELSE video_status END
        WHERE subject_id = ${subject.id}
      `;
      await addEvent({ subjectId: subject.id, message: "Retrying — will pick up from the last completed stage." });
      break;
    }
    case "rerecord": {
      // "Use this voice" from the episode page: keep every script, re-record
      // the narration in a different voice. The worker skips writing (already
      // done) and re-renders only because the voice no longer matches.
      const voice = String(body.voice || "");
      if (!VOICES.some((v) => v.id === voice)) return fail("Pick a voice from the list.");
      if (RUNNING.includes(subject.status) || subject.status === "queued") {
        return fail("Wait for this subject to finish (or pause it) before changing the voice.");
      }
      await database.sql`
        UPDATE subjects SET voice = ${voice}, status = 'queued', error = NULL, stage_detail = NULL,
          finished_at = NULL, updated_at = NOW()
        WHERE id = ${subject.id}
      `;
      await database.sql`
        UPDATE episodes SET voiceover_status = 'pending', voiceover_seconds = NULL, error = NULL, updated_at = NOW()
        WHERE subject_id = ${subject.id}
      `;
      const label = VOICES.find((v) => v.id === voice).label;
      await addEvent({ subjectId: subject.id, message: `Re-recording every episode with the voice "${label}".` });
      break;
    }
    case "set_voice": {
      // Change the voice of a subject that hasn't recorded yet; the worker
      // reads the voice fresh when it reaches the recording stage.
      const voice = String(body.voice || "");
      if (!VOICES.some((v) => v.id === voice)) return fail("Pick a voice from the list.");
      if (!["queued", "paused", "researching", "planning", "writing"].includes(subject.status)) {
        return fail("Recording has already started — use \"Use this voice\" on an episode page instead.");
      }
      await database.sql`UPDATE subjects SET voice = ${voice}, updated_at = NOW() WHERE id = ${subject.id}`;
      await addEvent({ subjectId: subject.id, message: `Voice changed to "${VOICES.find((v) => v.id === voice).label}".` });
      break;
    }
    case "move_up": {
      if (subject.status !== "queued") return fail("Only a queued subject can be moved.");
      const [above] = await database.sql`
        SELECT id, position FROM subjects
        WHERE status = 'queued' AND (position < ${subject.position} OR (position = ${subject.position} AND id < ${subject.id}))
        ORDER BY position DESC, id DESC LIMIT 1
      `;
      if (!above) break; // already at the front
      // Swap positions; if they were tied, give this one a strictly lower position.
      const newPos = above.position === subject.position ? above.position - 1 : above.position;
      await database.sql`UPDATE subjects SET position = ${subject.position}, updated_at = NOW() WHERE id = ${above.id}`;
      await database.sql`UPDATE subjects SET position = ${newPos}, updated_at = NOW() WHERE id = ${subject.id}`;
      break;
    }
    case "delete": {
      if (RUNNING.includes(subject.status)) return fail("Cancel it first, then delete.");
      const episodes = await database.sql`SELECT id, voiceover_key, voice_previews FROM episodes WHERE subject_id = ${subject.id}`;
      const store = getStore("voiceovers");
      for (const ep of episodes) {
        if (ep.voiceover_key) await store.delete(ep.voiceover_key).catch(() => {});
        for (const voice of Array.isArray(ep.voice_previews) ? ep.voice_previews : []) {
          await store.delete(`episode-${ep.id}-preview-${voice}.mp3`).catch(() => {});
        }
      }
      await database.sql`DELETE FROM subjects WHERE id = ${subject.id}`;
      return NextResponse.json({ ok: true, deleted: true });
    }
    default:
      return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  }

  const [updated] = await database.sql`SELECT id, status, position FROM subjects WHERE id = ${subject.id}`;
  return NextResponse.json({ ok: true, subject: updated });
}
