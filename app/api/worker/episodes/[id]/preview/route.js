import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { db } from "../../../../../../lib/db";
import { isWorkerAuthorized, unauthorized } from "../../../../../../lib/worker-auth";

// Receives the short MP3 preview of an episode's narration. The full-length
// WAV/MP3 stay on the PC: this runs on a Netlify Function, which rejects
// bodies over ~4.5 MB, and the dashboard only needs a taste of the voice.
export async function POST(request, { params }) {
  if (!isWorkerAuthorized(request)) return unauthorized();

  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (contentType !== "audio/mpeg") {
    return NextResponse.json({ error: "preview must be audio/mpeg" }, { status: 415 });
  }

  const audio = Buffer.from(await request.arrayBuffer());
  if (!audio.length) {
    return NextResponse.json({ error: "empty audio body" }, { status: 400 });
  }

  const key = `episode-${params.id}-preview.mp3`;
  await getStore("voiceovers").set(key, audio, { metadata: { contentType } });

  const [episode] = await db().sql`
    UPDATE episodes SET voiceover_key = ${key}, updated_at = NOW()
    WHERE id = ${params.id}
    RETURNING id
  `;
  if (!episode) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, key });
}
