import { NextResponse } from "next/server";
import { addEvent } from "../../../../lib/queries";
import { isWorkerAuthorized, unauthorized } from "../../../../lib/worker-auth";

// The worker's plain-English log lines ("Wrote chapter 4 of 10 — 712 words").
export async function POST(request) {
  if (!isWorkerAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || "").trim().slice(0, 1000);
  if (!body.subject_id || !message) {
    return NextResponse.json({ error: "subject_id and message are required" }, { status: 400 });
  }

  const level = ["info", "warn", "error"].includes(body.level) ? body.level : "info";
  await addEvent({
    subjectId: body.subject_id,
    episodeId: body.episode_id ?? null,
    level,
    message,
  });

  return NextResponse.json({ ok: true });
}
