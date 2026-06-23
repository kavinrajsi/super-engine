// Idempotent migration for the GSC Page Indexing snapshot store.
//   node --env-file=.env.local scripts/migrate-gsc-indexing.mjs

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL set.");
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS gsc_indexing_snapshots (
    id serial PRIMARY KEY,
    site_url text NOT NULL,
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;

await sql`
  CREATE INDEX IF NOT EXISTS gsc_indexing_snapshots_site_url_idx
    ON gsc_indexing_snapshots (site_url, created_at DESC)`;

console.log("gsc_indexing_snapshots: done.");
