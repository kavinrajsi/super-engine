// Idempotent migration for the Cloudflare analytics integration.
//   node --env-file=.env.local scripts/migrate-cloudflare.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL / DATABASE_URL_UNPOOLED in env.");
  process.exit(1);
}

const sql = neon(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS cloudflare_settings (
     id serial PRIMARY KEY,
     user_id integer,
     token_enc text,
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
];

for (const stmt of statements) {
  await sql.query(stmt);
}
console.log(`Applied ${statements.length} statement(s).`);
