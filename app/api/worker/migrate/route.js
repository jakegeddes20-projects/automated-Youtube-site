import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { isWorkerAuthorized, unauthorized } from "../../../../lib/worker-auth";

// LOCAL DEVELOPMENT ONLY. Netlify applies netlify/database/migrations/* on
// every production deploy; when running the site on this PC with
// `netlify dev`, this route applies them on request instead:
//
//   curl -X POST -H "Authorization: Bearer $WORKER_TOKEN" http://localhost:8888/api/worker/migrate
//
// It refuses to run anywhere but `netlify dev` (NETLIFY_DEV is only set
// there). Migrations are written to be safe to re-run.
export async function POST(request) {
  if (!isWorkerAuthorized(request)) return unauthorized();
  if (process.env.NETLIFY_DEV !== "true") {
    return NextResponse.json({ error: "only available under netlify dev" }, { status: 403 });
  }

  const dir = path.join(process.cwd(), "netlify", "database", "migrations");
  const folders = fs
    .readdirSync(dir)
    .filter((f) => fs.existsSync(path.join(dir, f, "migration.sql")))
    .sort();

  const { pool } = db();
  const applied = [];
  for (const folder of folders) {
    const sql = fs.readFileSync(path.join(dir, folder, "migration.sql"), "utf8");
    await pool.query(sql);
    applied.push(folder);
  }
  return NextResponse.json({ applied });
}
