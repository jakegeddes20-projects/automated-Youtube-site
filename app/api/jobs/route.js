import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { generatePlaceholderScript } from "../../../lib/placeholder-script";

export async function GET() {
  const database = db();
  const jobs = await database.sql`SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50`;
  return NextResponse.json({ jobs });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const topic = (body.topic || "").trim();

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const database = db();
  const script = generatePlaceholderScript(topic);

  const [job] = await database.sql`
    INSERT INTO jobs (topic, status, script)
    VALUES (${topic}, ${"script_ready"}, ${script})
    RETURNING *
  `;

  return NextResponse.json({ job }, { status: 201 });
}
