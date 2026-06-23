// Generate llms.txt, robots.txt, and JSON-LD structured data from a scan result.
// The app validates these elsewhere (ai-site.js); these produce sensible starting
// files. All pure + null-guarded.

const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

function rootSignals(result) {
  const pages = result?.pages || [];
  const p = pages.find((x) => x.url === result?.rootUrl && x.signals) || pages.find((x) => x.signals);
  return p?.signals || null;
}

function siteName(result, s) {
  if (s?.title) return s.title;
  try {
    return new URL(result.rootUrl).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

function pathOf(u) {
  try {
    return new URL(u).pathname || "/";
  } catch {
    return u;
  }
}

// --- llms.txt (the AI "sitemap"): title + summary + a curated link list. ---
export function generateLlmsTxt(result) {
  const s = rootSignals(result);
  const name = siteName(result, s);
  const summary =
    s?.metaDescription || result?.contentSummary?.summary || `Key pages and content for ${name}.`;

  // Prefer analyzed-page titles; fall back to sitemap URLs by path.
  const titles = new Map();
  for (const p of result?.pages || []) if (p.signals?.title) titles.set(p.url, p.signals.title);
  const urls = (result?.sitemap?.urls || []).map((u) => u.url);
  const list = (urls.length ? urls : [...titles.keys()]).slice(0, 50);

  const lines = [`# ${name}`, "", `> ${summary}`, "", "## Pages"];
  for (const u of list) {
    const label = titles.get(u) || pathOf(u);
    lines.push(`- [${label}](${u})`);
  }
  return lines.join("\n") + "\n";
}

// --- robots.txt: allow all + sitemap + explicit AI-bot allows (be citable). ---
export function generateRobotsTxt(result) {
  let sitemap = "";
  try {
    sitemap = new URL("/sitemap.xml", result.rootUrl).toString();
  } catch {
    /* no rootUrl */
  }
  const lines = ["User-agent: *", "Allow: /", ""];
  for (const bot of AI_BOTS) {
    lines.push(`User-agent: ${bot}`, "Allow: /", "");
  }
  if (sitemap) lines.push(`Sitemap: ${sitemap}`);
  return lines.join("\n") + "\n";
}

// --- JSON-LD: Organization + WebSite (Article when authorship is present). ---
export function generateJsonLd(result) {
  const s = rootSignals(result);
  const url = result?.rootUrl || "";
  const name = siteName(result, s);
  const graph = [
    { "@type": "Organization", name, url },
    {
      "@type": "WebSite",
      name,
      url,
      ...(s?.metaDescription ? { description: s.metaDescription } : {}),
      ...(s?.lang ? { inLanguage: s.lang } : {}),
    },
  ];
  if (s?.aiGeo?.author || s?.ld?.datePublished) {
    graph.push({
      "@type": "Article",
      headline: s.title || name,
      ...(s.aiGeo?.author ? { author: { "@type": "Person", name: String(s.aiGeo.author) } } : {}),
      mainEntityOfPage: url,
    });
  }
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2);
  return `<script type="application/ld+json">\n${json}\n</script>\n`;
}

export function generateArtifact(kind, result) {
  if (kind === "robots") return { text: generateRobotsTxt(result), filename: "robots.txt", type: "text/plain" };
  if (kind === "jsonld") return { text: generateJsonLd(result), filename: "structured-data.html", type: "text/html" };
  return { text: generateLlmsTxt(result), filename: "llms.txt", type: "text/plain" };
}
