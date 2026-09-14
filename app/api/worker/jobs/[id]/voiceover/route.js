import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { db } from "../../../../../../lib/db";

function isAuthorized(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return token && token === process.env.WORKER_TOKEN;
}

// Audio formats the worker may upload, mapped to the blob key extension.
const AUDIO_EXTENSIONS = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

// Receives a finished narration file from the GPU worker, stores it in
// Netlify Blobs, and marks the job's voice-over stage as done.
//
// Note: this runs on a Netlify Function, which rejects request bodies over
// ~4.5 MB (6 MB base64-encoded) before this code runs. The worker uploads a
// compressed MP3 preview for that reason and keeps the WAV master locally.
export async function POST(request, { params }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim();
  const extension = AUDIO_EXTENSIONS[contentType];
  if (!extension) {
    return NextResponse.json(
      { error: `unsupported content type: ${contentType || "(none)"}` },
      { status: 415 }
    );
  }

  const { id } = params;
  const audioBuffer = Buffer.from(await request.arrayBuffer());

  if (!audioBuffer.length) {
    return NextResponse.json({ error: "empty audio body" }, { status: 400 });
  }

  const store = getStore("voiceovers");
  const key = `${id}.${extension}`;
  await store.set(key, audioBuffer, {
    metadata: { contentType },
  });

  const database = db();
  await database.sql`
    UPDATE jobs
    SET voiceover_status = 'done', voiceover_key = ${key}, updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true, key });
}
