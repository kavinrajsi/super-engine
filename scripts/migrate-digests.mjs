// Idempotent migration for the daily email digest.
//   node --env-file=.env.local scripts/migrate-digests.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL / DATABASE_URL_UNPOOLED in env.");
  process.exit(1);
}

const sql = neon(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS digests (
     user_id integer NOT NULL,
     sent_date date NOT NULL,
     PRIMARY KEY (user_id, sent_date)
   )`,
];

for (const stmt of statements) {
  await sql.query(stmt);
}
console.log(`Applied ${statements.length} statement(s).`);
