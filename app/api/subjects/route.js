import { NextResponse } from "next/server";

// Always read live from the database; never prerender at build time.
export const dynamic = "force-dynamic";
import { db } from "../../../lib/db";
import { normalizeSettings } from "../../../lib/options";
import { addEvent, getSettings, getWorkerStatus } from "../../../lib/queries";

// GET: everything the home page needs in one request — the queue with each
// subject's episodes, plus worker status and the saved default settings.
export async function GET() {
  const database = db();
  const [subjects, episodes, worker, settings] = await Promise.all([
    database.sql`
      SELECT id, prompt, videos_per_subject, episode_minutes, voice, style,
             status, stage_detail, position, error, output_dir,
             claimed_at, finished_at, created_at, updated_at
      FROM subjects
      ORDER BY
        CASE status
          WHEN 'researching' THEN 0 WHEN 'planning' THEN 0 WHEN 'writing' THEN 0 WHEN 'voicing' THEN 0
          WHEN 'queued' THEN 1 WHEN 'paused' THEN 2 WHEN 'failed' THEN 3
          ELSE 4
        END,
        position, id
      LIMIT 100
    `,
    database.sql`
      SELECT id, subject_id, position, title, angle, word_count, script_status,
             voiceover_status, voiceover_key, voiceover_seconds, video_status,
             publish_status, youtube_url, output_dir, error
      FROM episodes
      WHERE subject_id IN (SELECT id FROM subjects ORDER BY id DESC LIMIT 100)
      ORDER BY subject_id, position
    `,
    getWorkerStatus(),
    getSettings(),
  ]);

  const bySubject = new Map();
  for (const ep of episodes) {
    if (!bySubject.has(ep.subject_id)) bySubject.set(ep.subject_id, []);
    bySubject.get(ep.subject_id).push(ep);
  }

  return NextResponse.json({
    subjects: subjects.map((s) => ({ ...s, episodes: bySubject.get(s.id) || [] })),
    worker,
    settings,
  });
}

// POST: "type a subject, press Go". Creates a queued subject at the back of
// the queue using the four settings (falling back to the saved defaults).
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Type a subject first." }, { status: 400 });
  }
  if (prompt.length > 300) {
    return NextResponse.json({ error: "Keep the subject under 300 characters." }, { status: 400 });
  }

  const defaults = await getSettings();
  const { settings, problems } = normalizeSettings(body, defaults);
  if (problems.length) {
    return NextResponse.json(
      { error: `Invalid setting: ${problems.join(", ")}` },
      { status: 400 }
    );
  }

  const database = db();
  const [subject] = await database.sql`
    INSERT INTO subjects (prompt, videos_per_subject, episode_minutes, voice, style, position)
    VALUES (
      ${prompt}, ${settings.videos_per_subject}, ${settings.episode_minutes},
      ${settings.voice}, ${settings.style},
      (SELECT COALESCE(MAX(position), 0) + 1 FROM subjects)
    )
    RETURNING *
  `;

  await addEvent({
    subjectId: subject.id,
    message: `Queued: ${settings.videos_per_subject} × ${settings.episode_minutes}-minute episode(s), ${settings.style} style.`,
  });

  return NextResponse.json({ subject }, { status: 201 });
}
