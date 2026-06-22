// Idempotent migration for the active-site / agent-flow feature.
//   node --env-file=.env.local scripts/migrate-active-site.mjs
//
// The full schema lives in the gitignored db/schema.sql; this standalone script
// applies just the additive columns this feature needs so it can run on a DB
// whose base tables already exist. Safe to re-run (IF NOT EXISTS).
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL / DATABASE_URL_UNPOOLED in env.");
  process.exit(1);
}

const sql = neon(url);

const statements = [
  // Active site = the most recently used brand profile (cross-device).
  `ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS last_used_at timestamptz`,
  // Review-and-approve loop: generated content starts as a draft.
  `ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'`,
];

for (const stmt of statements) {
  await sql.query(stmt);
}
console.log(`Applied ${statements.length} statement(s).`);
