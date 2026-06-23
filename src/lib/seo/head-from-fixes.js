// Assemble a corrected <head> block from AI fix suggestions + current signals.
// Pure + best-effort: known fields map to tags (suggested value, or current
// signal when untouched); JSON-LD/FAQ snippets are included verbatim; headings/
// other become guidance comments. A suggested value already containing markup is
// used as-is (so the model returning a full tag doesn't get double-wrapped).

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const isMarkup = (s) => typeof s === "string" && s.includes("<");

export function buildHeadBlock(suggestions = [], signals = {}) {
  const byField = Object.fromEntries((suggestions || []).map((s) => [s.field, s.suggested]));
  const pick = (field, current) => byField[field] ?? current ?? null;

  const lines = [];
  const tag = (field, current, render) => {
    const v = pick(field, current);
    if (v == null || v === "") return;
    lines.push(isMarkup(v) ? v.trim() : render(v));
  };

  tag("title", signals.title, (v) => `<title>${escapeHtml(v)}</title>`);
  tag("metaDescription", signals.metaDescription, (v) => `<meta name="description" content="${escapeHtml(v)}" />`);
  if (signals.canonical) lines.push(`<link rel="canonical" href="${escapeHtml(signals.canonical)}" />`);
  tag("ogTitle", signals.og?.title ?? pick("title", signals.title), (v) => `<meta property="og:title" content="${escapeHtml(v)}" />`);
  tag("ogDescription", signals.og?.description ?? pick("metaDescription", signals.metaDescription), (v) => `<meta property="og:description" content="${escapeHtml(v)}" />`);
  if (signals.og?.image) lines.push(`<meta property="og:image" content="${escapeHtml(signals.og.image)}" />`);
  tag("twitterCard", signals.twitter?.card || "summary_large_image", (v) => `<meta name="twitter:card" content="${escapeHtml(v)}" />`);

  // JSON-LD / FAQ schema suggestions are already <script> snippets.
  for (const field of ["jsonLd", "faqSchema"]) {
    if (byField[field]) lines.push(String(byField[field]).trim());
  }
  // Non-tag guidance.
  for (const s of suggestions || []) {
    if ((s.field === "headings" || s.field === "other") && s.suggested) {
      lines.push(`<!-- ${s.label}: ${String(s.suggested).replace(/-->/g, "->")} -->`);
    }
  }
  return lines.join("\n");
}
