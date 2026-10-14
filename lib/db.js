import { neon } from "@neondatabase/serverless";

// Postgres on Neon (added through the Vercel Storage tab, which sets
// DATABASE_URL on the project). `db().sql` is a tagged template that returns
// the rows, e.g.  const [row] = await db().sql`SELECT ... WHERE id = ${id}`
let client;

export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set — add a Neon database in the Vercel Storage tab.");
    client = { sql: neon(url) };
  }
  return client;
}
