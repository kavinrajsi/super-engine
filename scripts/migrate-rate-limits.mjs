// Idempotent migration for rate limiting.
//   node --env-file=.env.local scripts/migrate-rate-limits.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL / DATABASE_URL_UNPOOLED in env.");
  process.exit(1);
}

const sql = neon(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS rate_limits (
     key text PRIMARY KEY,
     window_start timestamptz NOT NULL,
     count int NOT NULL
   )`,
];

for (const stmt of statements) {
  await sql.query(stmt);
}
console.log(`Applied ${statements.length} statement(s).`);
