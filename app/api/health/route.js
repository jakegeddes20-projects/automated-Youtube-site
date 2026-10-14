import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// Plain-English "is the site set up?" check — shows which piece is missing
// without revealing any secret. Open /api/health in a browser.
export async function GET() {
  const checks = {
    database_url_set: Boolean(process.env.DATABASE_URL),
    worker_token_set: Boolean(process.env.WORKER_TOKEN),
    tables_ready: false,
    subjects: null,
  };
  if (checks.database_url_set) {
    try {
      const [row] = await db().sql`SELECT count(*)::int AS n FROM subjects`;
      checks.tables_ready = true;
      checks.subjects = row.n;
    } catch (e) {
      checks.database_error = String(e.message || e).slice(0, 200);
    }
  }
  const ok = checks.database_url_set && checks.worker_token_set && checks.tables_ready;
  return NextResponse.json({ ok, ...checks }, { status: ok ? 200 : 503 });
}
