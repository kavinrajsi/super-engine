// Idempotent migration for the calendar + weekly-digest + GSC-link batch.
//   node --env-file=.env.local scripts/migrate-feature-batch.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL / DATABASE_URL_UNPOOLED in env.");
  process.exit(1);
}

const sql = neon(url);

const statements = [
  // Content scheduling (calendar).
  `ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS scheduled_for timestamptz`,
  // Digest kind so daily + weekly don't collide on (user_id, sent_date).
  `ALTER TABLE digests ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'daily'`,
  `ALTER TABLE digests DROP CONSTRAINT IF EXISTS digests_pkey`,
  `CREATE UNIQUE INDEX IF NOT EXISTS digests_user_kind_date ON digests (user_id, kind, sent_date)`,
  // Link GSC tokens to the app user so background crons can reach GA/GSC.
  `ALTER TABLE gsc_tokens ADD COLUMN IF NOT EXISTS user_id integer`,
  `CREATE INDEX IF NOT EXISTS gsc_tokens_user_idx ON gsc_tokens (user_id, updated_at DESC)`,
];

for (const stmt of statements) {
  await sql.query(stmt);
}
console.log(`Applied ${statements.length} statement(s).`);
