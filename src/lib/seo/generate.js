// Generators: turn a scan result into ready-to-publish files.
//   - generateSitemap(result) -> sitemap.xml
//   - generateLlms(result)    -> llms.txt (llmstxt.org format)
// Pure functions; reused by the dashboard (client) and the standalone tools.

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isHome(url) {
  try {
    return new URL(url).pathname === "/";
  } catch {
    return false;
  }
}

// ---- sitemap.xml ----
export function generateSitemap(result) {
  // lastmod / priority / changefreq from the site's own sitemap (if any).
  const lastmodByUrl = new Map();
  const priorityByUrl = new Map();
  const changefreqByUrl = new Map();
  for (const u of result.sitemap?.urls || []) {
    if (!u.url) continue;
    if (u.lastmod) lastmodByUrl.set(u.url, u.lastmod);
    if (u.priority) priorityByUrl.set(u.url, u.priority);
    if (u.changefreq) changefreqByUrl.set(u.url, u.changefreq);
  }

  const urls = [
    ...result.pages.map((p) => p.url),
    ...(result.sitemap?.urls || []).map((u) => u.url),
    ...(result.missingFromSitemap || []),
  ].filter(Boolean);

  const unique = [...new Set(urls)].sort();

  const body = unique
    .map((url) => {
      const lastmod = lastmodByUrl.get(url);
      const changefreq = changefreqByUrl.get(url) || "weekly";
      const priority = priorityByUrl.get(url) || (isHome(url) ? "1.0" : "0.8");
      return (
        `  <url>\n    <loc>${xmlEscape(url)}</loc>` +
        (lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : "") +
        `\n    <changefreq>${changefreq}</changefreq>` +
        `\n    <priority>${priority}</priority>` +
        `\n  </url>`
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`
  );
}

// ---- robots.txt ----
export function generateRobotsTxt(result) {
  let origin = "";
  try {
    origin = new URL(result.rootUrl).origin;
  } catch {
    origin = "";
  }
  return (
    `# robots.txt\n` +
    `User-agent: *\n` +
    `Allow: /\n` +
    (origin ? `\nSitemap: ${origin}/sitemap.xml\n` : "")
  );
}

// ---- ai.txt (Spawning format — AI training-data preferences) ----
export function generateAiTxt(result) {
  let origin = "";
  try {
    origin = new URL(result.rootUrl).origin;
  } catch {
    origin = "";
  }
  return (
    `# ai.txt — preferences for AI crawlers and training data\n` +
    `# Allow AI access by default. Change "Allow" to "Disallow" to opt out.\n` +
    `User-Agent: *\n` +
    `Allow: /\n` +
    (origin ? `\n# Site: ${origin}\n` : "")
  );
}

// ---- llms.txt (llmstxt.org format) ----
function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function pathSegment(url, origin) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean)[0];
    return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : "Main";
  } catch {
    return "Main";
  }
}

function titleFor(p) {
  if (p.signals?.title) return p.signals.title;
  try {
    const u = new URL(p.url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last || u.hostname;
  } catch {
    return p.url;
  }
}

export function generateLlms(result) {
  const root = result.rootUrl;
  // Find the homepage page for site-level title/summary.
  const home =
    result.pages.find((p) => {
      try {
        return new URL(p.url).pathname === "/";
      } catch {
        return false;
      }
    }) || result.pages[0];

  const siteName =
    home?.signals?.og?.siteName || home?.signals?.title || hostname(root);
  const summary =
    home?.signals?.metaDescription || home?.signals?.og?.description || "";

  // Group analyzed pages by first path segment ("Main" for the homepage).
  const groups = new Map();
  for (const p of result.pages) {
    if (!p.audit) continue; // skip errored pages
    const section = pathSegment(p.url, root);
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(p);
  }

  // Order: Main first, then alphabetical.
  const sections = [...groups.keys()].sort((a, b) => {
    if (a === "Main") return -1;
    if (b === "Main") return 1;
    return a.localeCompare(b);
  });

  let out = `# ${siteName}\n`;
  if (summary) out += `\n> ${summary}\n`;

  for (const section of sections) {
    const items = groups.get(section);
    out += `\n## ${section}\n`;
    for (const p of items) {
      const desc = p.signals?.metaDescription
        ? `: ${p.signals.metaDescription.replace(/\s+/g, " ").slice(0, 120)}`
        : "";
      out += `- [${titleFor(p).replace(/\s+/g, " ").trim()}](${p.url})${desc}\n`;
    }
  }

  return out;
}
