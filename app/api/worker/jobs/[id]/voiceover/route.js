import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { db } from "../../../../../../lib/db";

function isAuthorized(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return token && token === process.env.WORKER_TOKEN;
}

// Receives a finished narration WAV file from the GPU worker, stores it in
// Netlify Blobs, and marks the job's voice-over stage as done.
export async function POST(request, { params }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const audioBuffer = Buffer.from(await request.arrayBuffer());

  if (!audioBuffer.length) {
    return NextResponse.json({ error: "empty audio body" }, { status: 400 });
  }

  const store = getStore("voiceovers");
  const key = `${id}.wav`;
  await store.set(key, audioBuffer, {
    metadata: { contentType: "audio/wav" },
  });

  const database = db();
  await database.sql`
    UPDATE jobs
    SET voiceover_status = 'done', voiceover_key = ${key}, updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}