// Candidate-keyword derivation — pure, zero imports, so it's safe to use from
// both the SERP provider (server) and the snapshot UI (client) without dragging
// any server-only code into the client bundle.

// Derive a few keywords to rank-check from on-page signals, so a live SERP
// snapshot works even without a connected Search Console. Meta keywords first
// (explicit intent), then the title (minus a trailing "| Brand") and first H1.
export function candidateKeywords(signals, max = 5) {
  if (!signals) return [];
  const out = [];
  const push = (s) => {
    const v = (s || "").trim();
    if (v && v.length >= 3 && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  };

  for (const kw of (signals.metaKeywords || "").split(",")) push(kw);
  push((signals.title || "").split(/[|–—\-]/)[0]);
  push(signals.h1s?.[0]);

  return out.slice(0, max);
}
