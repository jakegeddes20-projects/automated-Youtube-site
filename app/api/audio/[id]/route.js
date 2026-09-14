import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { db } from "../../../../lib/db";

// Public endpoint the dashboard's <audio> player streams from once a job's
// voice-over is done.
export async function GET(request, { params }) {
  const { id } = params;
  const database = db();
  const [job] = await database.sql`SELECT voiceover_key FROM jobs WHERE id = ${id}`;

  if (!job || !job.voiceover_key) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const store = getStore("voiceovers");
  const audio = await store.get(job.voiceover_key, { type: "arrayBuffer" });

  if (!audio) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(audio, {
    headers: { "Content-Type": "audio/wav" },
  });
}