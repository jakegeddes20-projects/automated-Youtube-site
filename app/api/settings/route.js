import { NextResponse } from "next/server";

// Always read live from the database; never prerender at build time.
export const dynamic = "force-dynamic";
import { isAdminAuthorized, unauthorized } from "../../../lib/admin-auth";
import { db } from "../../../lib/db";
import { normalizeSettings } from "../../../lib/options";
import { getSettings } from "../../../lib/queries";

// The remembered defaults for the four output settings.
// Public: Oracle and the dashboard read it.
export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

// PUT: change the saved defaults (voice, style, episode count, length). These
// defaults decide what every later subject costs to render on Jake's PC, so
// they need the ADMIN_TOKEN Bearer token.
export async function PUT(request) {
  if (!isAdminAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const current = await getSettings();
  const { settings, problems } = normalizeSettings(body, current);
  if (problems.length) {
    return NextResponse.json({ error: `Invalid setting: ${problems.join(", ")}` }, { status: 400 });
  }

  const database = db();
  for (const [key, value] of Object.entries(settings)) {
    await database.sql`
      INSERT INTO settings (key, value) VALUES (${key}, ${String(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
  }
  return NextResponse.json({ settings: await getSettings() });
}
