import { NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { isWorkerAuthorized, unauthorized } from "../../../../../../lib/worker-auth";

// The worker posts the planned episodes for a subject once the series plan
// exists. Re-posting (after a retry) updates titles/angles/outlines in place
// and keeps any scripts already written.
export async function POST(request, { params }) {
  if (!isWorkerAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const episodes = Array.isArray(body.episodes) ? body.episodes : [];
  if (!episodes.length) {
    return NextResponse.json({ error: "episodes array is required" }, { status: 400 });
  }

  const database = db();
  const saved = [];
  for (const ep of episodes) {
    const position = Number(ep.position);
    if (!Number.isInteger(position) || position < 1) {
      return NextResponse.json({ error: "each episode needs a position >= 1" }, { status: 400 });
    }
    const outline = ep.outline ? JSON.stringify(ep.outline) : null;
    const [row] = await database.sql`
      INSERT INTO episodes (subject_id, position, title, angle, outline)
      VALUES (${params.id}, ${position}, ${ep.title ?? null}, ${ep.angle ?? null}, ${outline}::jsonb)
      ON CONFLICT (subject_id, position) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, episodes.title),
        angle = COALESCE(EXCLUDED.angle, episodes.angle),
        outline = COALESCE(EXCLUDED.outline, episodes.outline),
        updated_at = NOW()
      RETURNING id, position, title, angle, script_status, voiceover_status
    `;
    saved.push(row);
  }

  return NextResponse.json({ episodes: saved });
}
