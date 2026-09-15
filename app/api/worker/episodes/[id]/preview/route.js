import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { db } from "../../../../../../lib/db";
import { VOICES } from "../../../../../../lib/options";
import { parseId } from "../../../../../../lib/queries";
import { isWorkerAuthorized, unauthorized } from "../../../../../../lib/worker-auth";

function previewKey(id, voice) {
  return voice ? `episode-${id}-preview-${voice}.mp3` : `episode-${id}-preview.mp3`;
}

// Receives a short MP3 preview of an episode's narration. Without ?voice=
// it is the episode's own narration (in the subject's chosen voice); with
// ?voice=<id> it is the same opening read in an alternative voice, for the
// "compare voices" section. Full-length audio stays on the PC: this runs on
// a Netlify Function, which rejects bodies over ~4.5 MB.
export async function POST(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isWorkerAuthorized(request)) return unauthorized();

  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (contentType !== "audio/mpeg") {
    return NextResponse.json({ error: "preview must be audio/mpeg" }, { status: 415 });
  }
  const voice = new URL(request.url).searchParams.get("voice") || null;
  if (voice && !VOICES.some((v) => v.id === voice)) {
    return NextResponse.json({ error: `unknown voice: ${voice}` }, { status: 400 });
  }

  const audio = Buffer.from(await request.arrayBuffer());
  if (!audio.length) {
    return NextResponse.json({ error: "empty audio body" }, { status: 400 });
  }

  const key = previewKey(id, voice);
  await getStore("voiceovers").set(key, audio, { metadata: { contentType } });

  const database = db();
  let episode;
  if (voice) {
    [episode] = await database.sql`
      UPDATE episodes
      SET voice_previews = (
            SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb)
            FROM jsonb_array_elements(voice_previews || to_jsonb(${voice}::text)) AS v
          ),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
  } else {
    [episode] = await database.sql`
      UPDATE episodes SET voiceover_key = ${key}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
  }
  if (!episode) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, key });
}
