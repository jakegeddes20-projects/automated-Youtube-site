import { NextResponse } from "next/server";
import { getEvents, getSubjectWithEpisodes } from "../../../../lib/queries";

// Subject detail: settings, research brief, series plan, episodes and log.
export async function GET(request, { params }) {
  const subject = await getSubjectWithEpisodes(params.id);
  if (!subject) return NextResponse.json({ error: "not found" }, { status: 404 });

  const events = await getEvents({ subjectId: subject.id, limit: 100 });
  return NextResponse.json({ subject, events });
}
