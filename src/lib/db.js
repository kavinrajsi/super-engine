// Neon (Postgres) client — plain parameterized SQL via the serverless driver.
// `sql` is null when DATABASE_URL isn't set, so every DB call can no-op safely.

import { neon } from "@neondatabase/serverless";

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
