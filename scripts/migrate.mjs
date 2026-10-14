// Applies db/migrations/*.sql in order. Every migration is written to be safe
// to re-run (IF NOT EXISTS / ON CONFLICT), so this runs on every Vercel build,
// the same way Netlify applied migrations on every deploy.
//
//   node scripts/migrate.mjs        (uses DATABASE_URL)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

export function splitStatements(text) {
  // Drop comment lines first (they can contain semicolons), then split on
  // statement-ending semicolons: the HTTP driver runs one statement per call.
  return text
    .replace(/^\s*--.*$/gm, "")
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("migrate: DATABASE_URL not set - skipping (fine for a local build).");
    return;
  }
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const sql = neon(url);
  for (const file of files) {
    for (const statement of splitStatements(fs.readFileSync(path.join(dir, file), "utf8"))) {
      await sql.query(statement);
    }
    console.log(`migrate: applied ${file}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error("migrate failed:", e.message);
    process.exit(1);
  });
}
