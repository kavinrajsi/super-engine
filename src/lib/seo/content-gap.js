// Content gap: keywords competitors rank for that the target domain doesn't —
// fuel for differentiated content ideas. Uses DataForSEO Labs ranked_keywords
// (paid). Best-effort: returns [] without creds or on error.

import { dfsPost, isDataForSeoConfigured } from "./dataforseo";

async function rankedKeywords(domain, limit = 100) {
  const r = await dfsPost("/dataforseo_labs/google/ranked_keywords/live", {
    target: domain,
    location_code: 2840, // United States
    language_code: "en",
    limit,
  });
  return (r?.items || [])
    .map((it) => ({
      keyword: it.keyword_data?.keyword,
      volume: it.keyword_data?.keyword_info?.search_volume ?? 0,
    }))
    .filter((k) => k.keyword);
}

// Returns up to `cap` gap keywords [{ keyword, volume }], volume-ranked.
export async function fetchContentGap(domain, competitorDomains = [], { cap = 20 } = {}) {
  if (!isDataForSeoConfigured()) return [];
  const targets = (competitorDomains || []).filter(Boolean).slice(0, 3);
  if (!targets.length) return [];

  const [ours, ...theirs] = await Promise.all([
    rankedKeywords(domain, 200).catch(() => []),
    ...targets.map((d) => rankedKeywords(d, 80).catch(() => [])),
  ]);

  const ourSet = new Set(ours.map((k) => k.keyword.toLowerCase()));
  const gap = new Map();
  for (const list of theirs) {
    for (const k of list) {
      const key = k.keyword.toLowerCase();
      if (ourSet.has(key)) continue;
      const cur = gap.get(key);
      if (!cur || k.volume > cur.volume) gap.set(key, { keyword: k.keyword, volume: k.volume });
    }
  }
  return [...gap.values()].sort((a, b) => b.volume - a.volume).slice(0, cap);
}
