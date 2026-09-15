import { NextResponse } from "next/server";
import { parseId } from "../../../../../lib/queries";
import { db } from "../../../../../lib/db";
import { isWorkerAuthorized, unauthorized } from "../../../../../lib/worker-auth";

// GET: full episode including script and outline (used on resume).
export async function GET(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!isWorkerAuthorized(request)) return unauthorized();

  const [episode] = await db().sql`SELECT * FROM episodes WHERE id = ${id}`;
  if (!episode) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ episode });
}

// PATCH: the worker reports per-episode progress and outputs. Omitted fields
// keep their current value.
export async function PATCH(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!isWorkerAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const outline = body.outline ? JSON.stringify(body.outline) : null;
  const chapters = Array.isArray(body.chapters) ? JSON.stringify(body.chapters) : null;
  const review = body.review && typeof body.review === "object" ? JSON.stringify(body.review) : null;
  const script = body.script ?? null;
  const wordCount = body.script ? body.script.split(/\s+/).filter(Boolean).length : null;

  const [episode] = await db().sql`
    UPDATE episodes SET
      title = COALESCE(${body.title ?? null}, title),
      angle = COALESCE(${body.angle ?? null}, angle),
      outline = COALESCE(${outline}::jsonb, outline),
      script = COALESCE(${script}, script),
      chapters = COALESCE(${chapters}::jsonb, chapters),
      review = COALESCE(${review}::jsonb, review),
      word_count = COALESCE(${wordCount}, word_count),
      script_status = COALESCE(${body.script_status ?? null}, script_status),
      voiceover_status = COALESCE(${body.voiceover_status ?? null}, voiceover_status),
      voiceover_seconds = COALESCE(${body.voiceover_seconds ?? null}, voiceover_seconds),
      video_status = COALESCE(${body.video_status ?? null}, video_status),
      publish_status = COALESCE(${body.publish_status ?? null}, publish_status),
      youtube_url = COALESCE(${body.youtube_url ?? null}, youtube_url),
      output_dir = COALESCE(${body.output_dir ?? null}, output_dir),
      error = CASE WHEN ${body.error === ""} THEN NULL ELSE COALESCE(${body.error ?? null}, error) END,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, position, script_status, voiceover_status, video_status, publish_status, word_count
  `;

  if (!episode) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ episode });
}
