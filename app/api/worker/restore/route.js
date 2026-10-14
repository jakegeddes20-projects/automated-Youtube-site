import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { isWorkerAuthorized, unauthorized } from "../../../../lib/worker-auth";

// One-off, used when the site moved from Netlify to Vercel: copies past
// subjects and episodes (rebuilt from the worker's output folders by
// restore-site.py) into the new database, KEEPING the subject ids. The
// worker finds each subject's folder by "<slug>-<id>", so the ids must match
// or a re-run would start from scratch instead of reusing the saved scripts.
//
// Safe to run twice: existing ids/positions are left alone. Worker-token only.
export async function POST(request) {
  if (!isWorkerAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { sql } = db();
  const restored = { subjects: 0, episodes: 0 };

  for (const s of Array.isArray(body.subjects) ? body.subjects : []) {
    const rows = await sql`
      INSERT INTO subjects (id, prompt, videos_per_subject, episode_minutes, voice, style, status,
                            position, research_brief, series_plan, output_dir)
      VALUES (${s.id}, ${s.prompt}, ${s.videos_per_subject}, ${s.episode_minutes}, ${s.voice}, ${s.style},
              ${s.status}, ${s.position ?? s.id}, ${s.research_brief ?? null}, ${s.series_plan ?? null},
              ${s.output_dir ?? null})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    restored.subjects += rows.length;
  }

  for (const e of Array.isArray(body.episodes) ? body.episodes : []) {
    const outline = e.outline ? JSON.stringify(e.outline) : null;
    const chapters = Array.isArray(e.chapters) ? JSON.stringify(e.chapters) : null;
    const review = e.review ? JSON.stringify(e.review) : null;
    const rows = await sql`
      INSERT INTO episodes (subject_id, position, title, angle, outline, script, chapters, review, word_count,
                            script_status, voiceover_status, voiceover_seconds, video_status, output_dir)
      VALUES (${e.subject_id}, ${e.position}, ${e.title ?? null}, ${e.angle ?? null}, ${outline}::jsonb,
              ${e.script ?? null}, ${chapters}::jsonb, ${review}::jsonb, ${e.word_count ?? null},
              ${e.script_status}, ${e.voiceover_status}, ${e.voiceover_seconds ?? null}, ${e.video_status},
              ${e.output_dir ?? null})
      ON CONFLICT (subject_id, position) DO NOTHING
      RETURNING id
    `;
    restored.episodes += rows.length;
  }

  // New subjects must number on from the highest old id (including ones that
  // only exist as folders on the PC), so a new subject never reuses a folder name.
  const reserve = Number(body.reserve_ids_up_to) || 0;
  await sql`
    SELECT setval(pg_get_serial_sequence('subjects', 'id'),
                  GREATEST((SELECT COALESCE(MAX(id), 0) FROM subjects), ${reserve}::int, 1))
  `;

  return NextResponse.json({ ok: true, restored });
}
