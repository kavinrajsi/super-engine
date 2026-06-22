// Safe, SSRF-aware fetching for user-supplied URLs.
//
// Users hand us arbitrary URLs that the server then fetches. Without guards
// that is a textbook SSRF hole (internal services, cloud metadata, etc.).
// This module centralizes URL validation + a hardened fetch wrapper so every
// outbound request in the app goes through the same checks.

import { lookup } from "node:dns/promises";

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
  // IPv4-mapped (::ffff:…). The URL parser canonicalizes the dotted form
  // (::ffff:127.0.0.1) to hex (::ffff:7f00:1), so handle BOTH: dotted tail goes
  // straight to isPrivateIPv4; hex form rebuilds the dotted quad from the last
  // two hextets. (A naive split(":").pop() returns "1" for the hex form and
  // lets 127.0.0.1 through — that was the bypass.)
  if (h.startsWith("::ffff:")) {
    const tail = h.slice("::ffff:".length);
    if (tail.includes(".")) return isPrivateIPv4(tail);
    const hextets = h.split(":");
    const hi = parseInt(hextets[hextets.length - 2] || "0", 16);
    const lo = parseInt(hextets[hextets.length - 1] || "0", 16);
    if (Number.isNaN(hi) || Number.isNaN(lo)) return true; // unparseable → unsafe
    const n = ((hi << 16) | lo) >>> 0;
    const dotted = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
    return isPrivateIPv4(dotted);
  }
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

// SSRF hardening beyond the literal-hostname check: resolve the hostname's A/AAAA
// records and reject if ANY resolves to a private/reserved IP. This blocks the
// "public name → 127.0.0.1 / 169.254.169.254" trick (e.g. localtest.me) that a
// string check can't catch. Residual: a sub-ms TOCTOU window remains since Node
// `fetch` re-resolves DNS at connect time (it can't be pinned to an IP cleanly);
// this still defeats the practical attack. Throws a user-safe Error when unsafe.
async function assertResolvedSafe(hostname) {
  let records;
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    return; // resolution failure surfaces later as a normal fetch error
  }
  for (const { address } of records) {
    if (isPrivateIPv4(address) || isPrivateIPv6(address)) {
      throw new Error("That host resolves to a private or reserved address.");
    }
  }
}

// Derive a coarse "is this response cacheable?" flag from Cache-Control.
// Public/long-lived without no-store/no-cache/private counts as cacheable.
function isCacheable(cacheControl) {
  if (!cacheControl) return false;
  const cc = cacheControl.toLowerCase();
  if (/no-store|no-cache|private/.test(cc)) return false;
  const maxAge = cc.match(/max-age=(\d+)/);
  return /public/.test(cc) || (maxAge && Number(maxAge[1]) > 0);
}

// Fetch with SSRF guard, timeout, size cap and a polite User-Agent.
// Returns { url, status, contentType, xRobotsTag, body, server, contentEncoding,
// cacheControl, cacheable, byteSize, timings } or throws. The header/size/timing
// fields support the Technical tab; phase timings are coarse (undici doesn't
// expose a TCP/TLS split), so we report TTFB (request → first byte), download,
// and total only.
export async function safeFetch(input, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = assertSafeUrl(input);
  await assertResolvedSafe(url.hostname);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startedAt = performance.now();
  let firstByteAt = null;

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml" },
    });

    // Re-validate the final URL in case redirects pointed somewhere internal.
    const finalUrl = assertSafeUrl(res.url || url.toString());
    await assertResolvedSafe(finalUrl.hostname);

    const reader = res.body?.getReader();
    let received = 0;
    const chunks = [];
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstByteAt === null) firstByteAt = performance.now();
        received += value.length;
        if (received > MAX_BYTES) {
          controller.abort();
          break;
        }
        chunks.push(value);
      }
    }

    const endedAt = performance.now();
    const body = new TextDecoder("utf-8").decode(
      chunks.length ? concatChunks(chunks, received) : new Uint8Array()
    );

    const cacheControl = res.headers.get("cache-control") || null;
    return {
      url: res.url || url.toString(),
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      xRobotsTag: res.headers.get("x-robots-tag") || null,
      body,
      server: res.headers.get("server") || null,
      contentEncoding: res.headers.get("content-encoding") || null,
      cacheControl,
      cacheable: isCacheable(cacheControl),
      byteSize: received,
      timings: {
        ttfbMs: Math.round((firstByteAt ?? endedAt) - startedAt),
        downloadMs: Math.round(endedAt - (firstByteAt ?? endedAt)),
        totalMs: Math.round(endedAt - startedAt),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

// Return the www/apex counterpart of a URL as a validated URL, or null.
// "https://madarth.com" -> "https://www.madarth.com" and vice-versa.
function toggleWww(url) {
  const u = new URL(url.toString());
  u.hostname = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
  try {
    return assertSafeUrl(u.toString());
  } catch {
    return null;
  }
}

// Resolve the canonical URL for user input by following HTTP redirects (e.g.
// apex -> www, http -> https). We only need the final URL + status, so the
// body is cancelled rather than downloaded. SSRF-safe: every candidate and
// every post-redirect URL is re-validated. If the entered host doesn't respond
// at all, the www/apex variant is tried once before giving up. Returns
// { url, status } or null when nothing resolved. (HTTP 3xx only — JS/meta
// refresh redirects are not followed.)
export async function resolveUrl(input, { timeoutMs = 8_000 } = {}) {
  const probe = async (u) => {
    await assertResolvedSafe(u.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(u, {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml" },
      });
      // Re-validate the final URL in case redirects pointed somewhere internal.
      const finalUrl = assertSafeUrl(res.url || u.toString());
      await assertResolvedSafe(finalUrl.hostname);
      // We only need the final URL + status, not the body.
      try {
        await res.body?.cancel();
      } catch {
        /* body already consumed/closed */
      }
      return { url: res.url || u.toString(), status: res.status };
    } finally {
      clearTimeout(timer);
    }
  };

  const first = assertSafeUrl(input);
  try {
    // A reachable-but-blocking host (e.g. 403) still resolves — keep it.
    return await probe(first);
  } catch {
    // Host didn't respond (DNS/connection failure) — try the www/apex variant.
    const alt = toggleWww(first);
    if (alt) {
      try {
        return await probe(alt);
      } catch {
        /* variant also failed */
      }
    }
    return null;
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
