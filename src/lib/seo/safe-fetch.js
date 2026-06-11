// Safe, SSRF-aware fetching for user-supplied URLs.
//
// Users hand us arbitrary URLs that the server then fetches. Without guards
// that is a textbook SSRF hole (internal services, cloud metadata, etc.).
// This module centralizes URL validation + a hardened fetch wrapper so every
// outbound request in the app goes through the same checks.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "metadata.google.internal", // GCP metadata
]);

// Cloud metadata + obvious internal addresses we never want to reach.
const BLOCKED_LITERAL_IPS = new Set(["169.254.169.254", "::1", "0.0.0.0"]);

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB cap per page — plenty for HTML/sitemaps.
const USER_AGENT =
  "MetaTagSEOBot/0.1 (+https://example.com/bot; on-page SEO audit)";

// Detect private / reserved IPv4 ranges from a dotted-quad string.
function isPrivateIPv4(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (m.slice(1).some((o) => Number(o) > 255)) return true; // malformed -> treat as unsafe
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this" network
  if (a === 169 && b === 254) return true; // link-local (incl. metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

function isPrivateIPv6(host) {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique local
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("::ffff:")) return isPrivateIPv4(h.split(":").pop()); // mapped v4
  return false;
}

// Validate a user-supplied URL string. Returns a normalized URL object.
// Throws an Error with a user-safe message when the URL is not allowed.
export function assertSafeUrl(input) {
  // Default to https:// when the user omits the scheme (e.g. "example.com").
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test((input || "").trim())
    ? input.trim()
    : `https://${(input || "").trim()}`;

  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  const host = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_LITERAL_IPS.has(host)) {
    throw new Error("That host is not allowed.");
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Internal hostnames are not allowed.");
  }
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    throw new Error("Private or reserved IP addresses are not allowed.");
  }

  return url;
}

// Fetch with SSRF guard, timeout, size cap and a polite User-Agent.
// Returns { url, status, contentType, body } or throws.
export async function safeFetch(input, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = assertSafeUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml" },
    });

    // Re-validate the final URL in case redirects pointed somewhere internal.
    assertSafeUrl(res.url || url.toString());

    const reader = res.body?.getReader();
    let received = 0;
    const chunks = [];
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        if (received > MAX_BYTES) {
          controller.abort();
          break;
        }
        chunks.push(value);
      }
    }

    const body = new TextDecoder("utf-8").decode(
      chunks.length ? concatChunks(chunks, received) : new Uint8Array()
    );

    return {
      url: res.url || url.toString(),
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      xRobotsTag: res.headers.get("x-robots-tag") || null,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

function concatChunks(chunks, total) {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
