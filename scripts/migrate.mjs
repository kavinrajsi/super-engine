// One-off Neon migration. Run with the env loaded:
//   node --env-file=.env.local scripts/migrate.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL / DATABASE_URL_UNPOOLED in env.");
  process.exit(1);
}

const sql = neon(url);
const ddl = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = ddl.split(";").map((s) => s.trim()).filter(Boolean);

for (const stmt of statements) {
  await sql.query(stmt);
}
console.log(`Applied ${statements.length} statement(s).`);
