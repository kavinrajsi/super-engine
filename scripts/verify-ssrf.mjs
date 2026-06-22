// Quick SSRF guard check for assertSafeUrl (sync literal checks).
//   node scripts/verify-ssrf.mjs
import { assertSafeUrl } from "../src/lib/seo/safe-fetch.js";

const shouldBlock = [
  "http://[::ffff:127.0.0.1]", // IPv6-mapped IPv4 loopback (the bypass)
  "http://[::ffff:10.0.0.1]",
  "http://127.0.0.1",
  "http://10.0.0.1",
  "http://169.254.169.254", // cloud metadata
  "http://localhost",
  "http://[::1]",
  "ftp://example.com",
];
const shouldPass = ["https://vercel.com", "http://example.com", "madarth.com"];

let fail = 0;
for (const u of shouldBlock) {
  try {
    assertSafeUrl(u);
    console.log(`✗ NOT blocked (should block): ${u}`);
    fail++;
  } catch {
    console.log(`✓ blocked: ${u}`);
  }
}
for (const u of shouldPass) {
  try {
    assertSafeUrl(u);
    console.log(`✓ allowed: ${u}`);
  } catch (e) {
    console.log(`✗ blocked (should allow): ${u} — ${e.message}`);
    fail++;
  }
}
console.log(`\n${fail === 0 ? "ALL OK" : `${fail} FAILED`}`);
process.exit(fail ? 1 : 0);
