// Validate the "internet scan" assumption: Google News RSS returns parseable
// headlines (mirrors src/lib/seo/news.js#fetchNews without the app's module graph).
//   node scripts/verify-news.mjs [query]
import * as cheerio from "cheerio";

const term = process.argv[2] || "next.js";
const url =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent(term) +
  "&hl=en-US&gl=US&ceid=US:en";

const res = await fetch(url, { headers: { "User-Agent": "MetaTagSEOBot/0.1" } });
const body = await res.text();
const $ = cheerio.load(body, { xmlMode: true });
const items = $("item")
  .slice(0, 8)
  .map((_, el) => $(el).find("title").first().text().trim())
  .get()
  .filter(Boolean);

console.log(`status ${res.status}, ${$("item").length} items for "${term}"`);
for (const t of items) console.log(" -", t);
console.log(items.length ? "\nOK" : "\nNO ITEMS");
process.exit(items.length ? 0 : 1);
