import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getEvents, parseId } from "../../../../lib/queries";

// Episode page data: the full script, its outline, and its own log lines.
export async function GET(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const database = db();
  const [episode] = await database.sql`
    SELECT e.*, s.prompt AS subject_prompt, s.style, s.voice, s.episode_minutes,
           s.status AS subject_status
    FROM episodes e JOIN subjects s ON s.id = e.subject_id
    WHERE e.id = ${id}
  `;
  if (!episode) return NextResponse.json({ error: "not found" }, { status: 404 });

  const events = await getEvents({ episodeId: episode.id, limit: 100 });
  return NextResponse.json({ episode, events });
}
