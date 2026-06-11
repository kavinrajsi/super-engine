// Headless rendering for JS-rendered pages.
//
// Lightweight by design: we use puppeteer-core (no bundled Chromium) and either
//   1. connect to a remote browser over CDP  (BROWSER_WS_ENDPOINT) — recommended
//      for production (Browserless / Browserbase / Cloudflare Browser Rendering)
//   2. launch a local Chrome (CHROME_EXECUTABLE_PATH) — handy for dev
// When neither is configured, renderHtml() returns null and the scan stays on
// the fast fetch-only path (the page keeps its "needs headless" flag).

import { assertSafeUrl } from "./safe-fetch";

const NAV_TIMEOUT_MS = 15_000;
const USER_AGENT = "MetaTagSEOBot/0.1 (+headless; on-page SEO audit)";

export function isHeadlessAvailable() {
  return !!(process.env.BROWSER_WS_ENDPOINT || process.env.CHROME_EXECUTABLE_PATH);
}

// Render a URL in a real browser and return the fully-rendered HTML, or null if
// rendering isn't available or fails. SSRF-guarded like the fetch path.
export async function renderHtml(url) {
  if (!isHeadlessAvailable()) return null;
  try {
    assertSafeUrl(url);
  } catch {
    return null;
  }

  let puppeteer;
  try {
    puppeteer = (await import("puppeteer-core")).default;
  } catch {
    return null;
  }

  const remote = process.env.BROWSER_WS_ENDPOINT;
  let browser = null;
  try {
    browser = remote
      ? await puppeteer.connect({ browserWSEndpoint: remote })
      : await puppeteer.launch({
          executablePath: process.env.CHROME_EXECUTABLE_PATH,
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS });
    const html = await page.content();
    await page.close();
    return html;
  } catch {
    return null;
  } finally {
    if (browser) {
      try {
        if (remote) await browser.disconnect();
        else await browser.close();
      } catch {
        /* ignore teardown errors */
      }
    }
  }
}
