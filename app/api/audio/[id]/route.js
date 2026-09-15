import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { db } from "../../../../lib/db";
import { VOICES } from "../../../../lib/options";
import { parseId } from "../../../../lib/queries";

// Streams an episode's narration preview to the dashboard's <audio> player.
// ?voice=<id> serves the same opening in an alternative voice, if the worker
// has produced one.
export async function GET(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const voice = new URL(request.url).searchParams.get("voice") || null;
  const [episode] = await db().sql`SELECT voiceover_key, voice_previews FROM episodes WHERE id = ${id}`;
  if (!episode) return NextResponse.json({ error: "not found" }, { status: 404 });

  let key = episode.voiceover_key;
  if (voice) {
    const available = Array.isArray(episode.voice_previews) ? episode.voice_previews : [];
    if (!VOICES.some((v) => v.id === voice) || !available.includes(voice)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    key = `episode-${id}-preview-${voice}.mp3`;
  }
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const blob = await getStore("voiceovers").getWithMetadata(key, { type: "arrayBuffer" });
  if (!blob) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(blob.data, {
    headers: {
      "Content-Type": blob.metadata?.contentType || "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
