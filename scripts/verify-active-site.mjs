// One-off data-layer verification for the active-site / agent-flow feature.
//   node --env-file=.env.local scripts/verify-active-site.mjs
//
// Runs the same SQL the db helpers run, against the live DB (anonymous rows, so
// no users FK needed), and cleans up after itself. This is the risk surface the
// auth-gated UI hides: new columns, NULLS LAST ordering, the ANY() URL lookup,
// and the status round-trip. (Imports the helper modules directly aren't usable
// from plain Node because they use Next's extensionless imports.)
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL in env.");
  process.exit(1);
}
const sql = neon(url);

let pass = 0;
let fail = 0;
function check(label, ok) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  ok ? pass++ : fail++;
}

const tag = `verify-${Math.round(Date.now() / 1000)}`;

// 1. Active-site flip (mirrors createProfile / getActiveProfile / touchProfile).
const [a] = await sql`
  INSERT INTO brand_profiles (user_id, name, website_url, markdown, last_used_at)
  VALUES (NULL, ${`${tag}-A`}, 'https://a.example', '', now())
  RETURNING id, last_used_at`;
const [b] = await sql`
  INSERT INTO brand_profiles (user_id, name, website_url, markdown, last_used_at)
  VALUES (NULL, ${`${tag}-B`}, 'b.example', '', now())
  RETURNING id, last_used_at`;
check("insert profile A with last_used_at", !!a?.id);
check("insert profile B (schemeless url) ", !!b?.id);

const activeProfile = async () => {
  const rows = await sql`
    SELECT id FROM brand_profiles WHERE user_id IS NULL
    ORDER BY last_used_at DESC NULLS LAST, updated_at DESC LIMIT 1`;
  return rows[0]?.id;
};
check("getActiveProfile = most recent (B)", (await activeProfile()) === b.id);

await sql`UPDATE brand_profiles SET last_used_at = now() WHERE id = ${a.id} AND user_id IS NULL`;
check("getActiveProfile flips to touched (A)", (await activeProfile()) === a.id);

// 2. Review-and-approve round-trip (saveContent default + updateContentStatus).
const [item] = await sql`
  INSERT INTO generated_content (user_id, profile_id, kind, topic, title, markdown, data, status)
  VALUES (NULL, NULL, 'article', ${`${tag}-topic`}, ${`${tag}-title`}, '# hi', NULL, 'draft')
  RETURNING id, status`;
check("saveContent default status='draft'", item?.status === "draft");

const [approved] = await sql`
  UPDATE generated_content SET status = 'approved' WHERE id = ${item.id} AND user_id IS NULL
  RETURNING id, status`;
check("updateContentStatus → 'approved'", approved?.status === "approved");

// 3. latestScanForUrl's ANY() lookup executes without error.
let scanOk = true;
try {
  await sql`
    SELECT result FROM scans
    WHERE url = ANY(${["https://example.com/", "https://example.com"]}) AND user_id IS NULL
      AND created_at > now() - make_interval(mins => ${60 * 24})
    ORDER BY created_at DESC LIMIT 1`;
} catch (e) {
  scanOk = false;
  console.error("  latestScanForUrl SQL error:", e.message);
}
check("latestScanForUrl ANY() lookup executes", scanOk);

// Cleanup.
await sql`DELETE FROM brand_profiles WHERE id IN (${a.id}, ${b.id})`;
await sql`DELETE FROM generated_content WHERE id = ${item.id}`;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
