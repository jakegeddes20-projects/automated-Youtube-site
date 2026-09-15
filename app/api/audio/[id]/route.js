import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { db } from "../../../../lib/db";

// Streams an episode's narration preview to the dashboard's <audio> player.
export async function GET(request, { params }) {
  const [episode] = await db().sql`SELECT voiceover_key FROM episodes WHERE id = ${params.id}`;
  if (!episode || !episode.voiceover_key) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const blob = await getStore("voiceovers").getWithMetadata(episode.voiceover_key, {
    type: "arrayBuffer",
  });
  if (!blob) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(blob.data, {
    headers: {
      "Content-Type": blob.metadata?.contentType || "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
