// "Scan the internet" for fresh, on-topic angles via Google News RSS (free,
// public). Used by the daily Ideas generator. Best-effort: any failure returns
// an empty list so idea generation falls back to brand memory alone.

import * as cheerio from "cheerio";
import { safeFetch } from "./safe-fetch";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "our", "you", "are", "from", "that", "this",
  "site", "website", "brand", "company", "page", "home", "welcome", "inc", "llc",
]);

function hostOf(url) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Derive up to `max` search terms for a brand profile: its name, its domain, and
// a couple of meaningful words pulled from the Brand Memory markdown.
export function ideaKeywords(profile, max = 3) {
  const terms = [];
  const name = (profile?.name || "").trim();
  if (name) terms.push(name);

  const host = hostOf(profile?.website_url || "");
  if (host) terms.push(host.split(".")[0]); // "acme" from "acme.com"

  const words = (profile?.markdown || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
  terms.push(...top);

  // Dedupe (case-insensitive), drop empties, cap.
  const seen = new Set();
  const out = [];
  for (const t of terms) {
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

// Fetch recent news headlines for each term from Google News RSS, merged +
// deduped. Returns [{ title, source, pubDate }]. Never throws.
export async function fetchNews(keywords, { perTopic = 6, cap = 15 } = {}) {
  const terms = (keywords || []).filter(Boolean).slice(0, 3);
  if (!terms.length) return [];

  const lists = await Promise.all(
    terms.map(async (term) => {
      const url =
        "https://news.google.com/rss/search?q=" +
        encodeURIComponent(term) +
        "&hl=en-US&gl=US&ceid=US:en";
      try {
        const res = await safeFetch(url, { timeoutMs: 10_000 });
        const $ = cheerio.load(res.body, { xmlMode: true });
        return $("item")
          .slice(0, perTopic)
          .map((_, el) => {
            const $el = $(el);
            return {
              title: $el.find("title").first().text().trim(),
              source: $el.find("source").first().text().trim() || null,
              pubDate: $el.find("pubDate").first().text().trim() || null,
            };
          })
          .get()
          .filter((h) => h.title);
      } catch {
        return [];
      }
    })
  );

  const seen = new Set();
  const merged = [];
  for (const h of lists.flat()) {
    const k = h.title.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(h);
    if (merged.length >= cap) break;
  }
  return merged;
}
