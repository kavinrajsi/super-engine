// Site-level AI-readiness checks (AGO — agent/AI-crawler accessibility).
//
// Two signals fetched once per scan:
//   1. /llms.txt  — the emerging convention for guiding LLMs around a site
//   2. robots.txt — whether major AI crawlers are allowed or blocked

import { safeFetch } from "./safe-fetch";

// Crawlers used by AI answer engines / training. Being reachable by these is
// what makes a site visible to generative search.
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
];

// Check for a well-known text file at the site root. Present = 2xx, non-empty,
// and not an HTML soft-404. Returns the body so callers can validate structure.
async function checkRootFile(origin, path) {
  const url = new URL(path, origin).toString();
  try {
    const res = await safeFetch(url);
    const body = (res.body || "").trim();
    const present =
      res.status < 400 &&
      body.length > 0 &&
      !body.startsWith("<") &&
      !/text\/html/i.test(res.contentType || "");
    return { present, url, body };
  } catch {
    return { present: false, url, body: "" };
  }
}

// Is a link target acceptable in an llms.txt list?
function isValidLlmsUrl(url) {
  if (/^https?:\/\/\S+$/i.test(url)) return true; // absolute http(s)
  if (/^(mailto:|tel:)\S+$/i.test(url)) return true; // contact links
  if (/^\/[^\s)]*$/.test(url)) return true; // root-relative
  if (/^\.{1,2}\/[^\s)]*$/.test(url)) return true; // relative
  if (/^#\S*/.test(url)) return true; // in-page anchor
  return false;
}

function firstContentLine(lines) {
  for (let i = 0; i < lines.length; i++) if (lines[i].trim()) return i + 1;
  return 1;
}

// Validate an llms.txt / llms-full.txt against the llmstxt.org format, line by
// line, producing findings with a severity (error | warning | info) and a line
// number — the level of detail dedicated validators provide.
//   # Title            (required H1)
//   > summary          (recommended blockquote)
//   ## Section         (H2 sections; "## Optional" = lower-priority links)
//   - [name](url): ... (markdown link lists)
// llms-full.txt is the expanded full-content variant: H1 + substantial markdown.
function validateLlms(body, { full = false } = {}) {
  const text = (body || "").trim();
  if (!text) {
    return { valid: false, findings: [{ severity: "error", message: "Empty file.", line: 1 }], stats: {} };
  }

  const lines = (body || "").replace(/\r\n/g, "\n").split("\n");
  const findings = [];
  let title = null;
  let h1Count = 0;
  let h1Line = null;
  let hasSummary = false;
  let sections = 0;
  let optionalSection = false;
  let links = 0;
  let validLinks = 0;

  lines.forEach((raw, i) => {
    const line = raw.trim();
    const n = i + 1;

    const h1 = line.match(/^#\s+(.+)/);
    if (h1) {
      h1Count += 1;
      if (!title) {
        title = h1[1].trim();
        h1Line = n;
      } else {
        findings.push({ severity: "warning", message: "Multiple H1 titles; llms.txt should have exactly one.", line: n });
      }
      return;
    }

    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      sections += 1;
      if (/^optional\b/i.test(h2[1].trim())) optionalSection = true;
      return;
    }

    if (/^>\s+\S/.test(line)) {
      hasSummary = true;
      return;
    }

    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      const m = li[1].match(/^\[([^\]]*)\]\(([^)]*)\)/);
      if (m) {
        links += 1;
        const label = m[1].trim();
        const url = m[2].trim();
        if (!label) findings.push({ severity: "warning", message: "Link is missing its [name] text.", line: n });
        if (!url) findings.push({ severity: "warning", message: "Link is missing its (url).", line: n });
        else if (!isValidLlmsUrl(url))
          findings.push({ severity: "warning", message: `Link URL looks invalid: ${url.slice(0, 60)}`, line: n });
        if (label && url && isValidLlmsUrl(url)) validLinks += 1;
      } else if (/\[[^\]]*\]\(/.test(li[1])) {
        findings.push({ severity: "warning", message: "Malformed markdown link — expected [name](url).", line: n });
      }
    }
  });

  if (!title) {
    findings.push({ severity: "error", message: 'Missing required H1 title (e.g. "# Project Name").', line: 1 });
  } else if (h1Line !== firstContentLine(lines)) {
    findings.push({ severity: "info", message: "H1 title should be the first line of the file.", line: h1Line });
  }

  if (full) {
    if (text.length < 500)
      findings.push({ severity: "warning", message: "Too short to be the full-content variant.", line: lines.length });
  } else {
    if (!hasSummary)
      findings.push({ severity: "warning", message: "No '> summary' blockquote after the title (recommended).", line: h1Line ? h1Line + 1 : 2 });
    if (sections === 0 && links === 0)
      findings.push({ severity: "error", message: "No '## Section' link lists — llms.txt should list key resources.", line: lines.length });
    else if (links === 0)
      findings.push({ severity: "warning", message: "Sections present but no markdown links '- [name](url)'.", line: lines.length });
  }

  const valid = !findings.some((f) => f.severity === "error");
  return {
    valid,
    findings,
    stats: { title, h1Count, hasSummary, sections, optionalSection, links, validLinks, bytes: text.length },
  };
}

// Combine fetch + validation into a body-free summary safe to pass to the client.
function summarizeLlms(raw, full) {
  if (!raw.present) {
    return { present: false, valid: false, url: raw.url, findings: [], stats: {} };
  }
  const v = validateLlms(raw.body, { full });
  return { present: true, url: raw.url, valid: v.valid, findings: v.findings, stats: v.stats };
}

// Validate /ai.txt — the Spawning AI-data file, which uses robots.txt-style
// directives (User-Agent / Allow / Disallow) to opt content in or out of AI
// training.
function validateAiTxt(body) {
  const lines = (body || "").replace(/\r\n/g, "\n").split("\n");
  const findings = [];
  let hasUA = false;
  let rules = 0;
  lines.forEach((raw, i) => {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) return;
    if (/^user-agent\s*:/i.test(line)) hasUA = true;
    else if (/^(allow|disallow)\s*:/i.test(line)) rules += 1;
    else if (!/^[a-z-]+\s*:/i.test(line))
      findings.push({ severity: "info", message: `Unrecognized line: ${line.slice(0, 50)}`, line: i + 1 });
  });
  if (!hasUA) findings.push({ severity: "warning", message: "No 'User-Agent:' directive found.", line: 1 });
  if (rules === 0) findings.push({ severity: "warning", message: "No Allow/Disallow rules found.", line: 1 });
  const valid = hasUA && rules > 0;
  return { valid, findings, stats: { rules } };
}

function summarizeAiTxt(raw) {
  if (!raw.present) {
    return { present: false, valid: false, url: raw.url, findings: [], stats: {} };
  }
  const v = validateAiTxt(raw.body);
  return { present: true, url: raw.url, valid: v.valid, findings: v.findings, stats: v.stats };
}

// Parse robots.txt into user-agent groups with their rules.
function parseRobots(txt) {
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const m = line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const val = m[2].trim();
    if (field === "user-agent") {
      if (!lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if (cur) {
      cur.rules.push({ type: field, path: val });
      lastWasAgent = false;
    }
  }
  return groups;
}

function isBlocked(groups, agentLower) {
  const group = groups.find((g) => g.agents.includes(agentLower));
  if (!group) return false; // not mentioned -> allowed by default
  // Blocked if it disallows the site root with no overriding allow.
  const disallowRoot = group.rules.some((r) => r.type === "disallow" && r.path === "/");
  const allowRoot = group.rules.some((r) => r.type === "allow" && r.path === "/");
  return disallowRoot && !allowRoot;
}

async function checkAiBots(origin) {
  try {
    const res = await safeFetch(new URL("/robots.txt", origin).toString());
    if (res.status >= 400) return { robotsFound: false, blocked: [], allowed: AI_CRAWLERS };
    const groups = parseRobots(res.body);
    const wildcardBlocked = isBlocked(groups, "*");
    const blocked = [];
    const allowed = [];
    for (const bot of AI_CRAWLERS) {
      const botBlocked = isBlocked(groups, bot.toLowerCase());
      // A wildcard disallow blocks bots that aren't explicitly allowed.
      const explicitlyListed = groups.some((g) => g.agents.includes(bot.toLowerCase()));
      if (botBlocked || (wildcardBlocked && !explicitlyListed)) blocked.push(bot);
      else allowed.push(bot);
    }
    return { robotsFound: true, blocked, allowed };
  } catch {
    return { robotsFound: false, blocked: [], allowed: AI_CRAWLERS };
  }
}

// Fetch the site-level AI signals for a root URL: llms.txt, llms-full.txt, and
// the AI-crawler policy from robots.txt.
export async function fetchAiSiteContext(rootUrl) {
  const origin = new URL(rootUrl).origin;
  const [llmsRaw, llmsFullRaw, aiTxtRaw, aiBots] = await Promise.all([
    checkRootFile(origin, "/llms.txt"),
    checkRootFile(origin, "/llms-full.txt"),
    checkRootFile(origin, "/ai.txt"),
    checkAiBots(origin),
  ]);
  return {
    llmsTxt: summarizeLlms(llmsRaw, false),
    llmsFullTxt: summarizeLlms(llmsFullRaw, true),
    aiTxt: summarizeAiTxt(aiTxtRaw),
    aiBots,
  };
}
