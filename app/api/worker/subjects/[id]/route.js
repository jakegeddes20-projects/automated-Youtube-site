import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSubjectWithEpisodes, parseId } from "../../../../../lib/queries";
import { isWorkerAuthorized, unauthorized } from "../../../../../lib/worker-auth";

// GET: the worker re-reads a subject between stages to notice a pause or
// cancel requested from the dashboard.
export async function GET(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!isWorkerAuthorized(request)) return unauthorized();

  const subject = await getSubjectWithEpisodes(id);
  if (!subject) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ subject });
}

// PATCH: the worker reports stage changes and stage outputs. Every field is
// optional; anything omitted is left as it was (COALESCE keeps the old value).
export async function PATCH(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!isWorkerAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const status = body.status ?? null;
  const stageDetail = body.stage_detail ?? null;
  const clearStageDetail = body.stage_detail === "";
  const error = body.error ?? null;
  const researchBrief = body.research_brief ?? null;
  const seriesPlan = body.series_plan ?? null;
  const outputDir = body.output_dir ?? null;
  const finished = status === "done" || status === "failed" || status === "cancelled";

  // A pause or cancel clicked on the dashboard must not be overwritten by a
  // stage change the worker sends a moment later; the worker sees it on its
  // next control check and stops.
  const userControlled = status !== null && !["failed", "cancelled", "paused"].includes(status);

  const [subject] = await db().sql`
    UPDATE subjects SET
      status = CASE
        WHEN status IN ('paused', 'cancelled') AND ${userControlled} THEN status
        ELSE COALESCE(${status}, status)
      END,
      stage_detail = CASE WHEN ${clearStageDetail} THEN NULL ELSE COALESCE(${stageDetail}, stage_detail) END,
      error = CASE WHEN ${status === "queued" || status === "researching"} THEN NULL ELSE COALESCE(${error}, error) END,
      research_brief = COALESCE(${researchBrief}, research_brief),
      series_plan = COALESCE(${seriesPlan}, series_plan),
      output_dir = COALESCE(${outputDir}, output_dir),
      finished_at = CASE WHEN ${finished} THEN NOW() ELSE finished_at END,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, status, stage_detail
  `;

  if (!subject) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ subject });
}
