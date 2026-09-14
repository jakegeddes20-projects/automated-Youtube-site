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
  const blob = await store.getWithMetadata(job.voiceover_key, { type: "arrayBuffer" });

  if (!blob) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // The upload route records the format in blob metadata; older blobs
  // predate that and are all WAV.
  const contentType = blob.metadata?.contentType || "audio/wav";

  return new NextResponse(blob.data, {
    headers: { "Content-Type": contentType },
  });
}
