// Headless rendering for JS-rendered pages.
//
// Lightweight by design: we use puppeteer-core (no bundled Chromium) and either
//   1. connect to a remote browser over CDP  (BROWSER_WS_ENDPOINT) — recommended
//      for production (Browserless / Browserbase / Cloudflare Browser Rendering)
//   2. create a fresh Browserbase session     (BROWSERBASE_API_KEY + _PROJECT_ID)
//   3. launch a local Chrome                   (CHROME_EXECUTABLE_PATH) — for dev
// When none is configured, the helpers return null and callers fall back to the
// fast fetch-only path (the page keeps its "needs headless" flag).

import { assertSafeUrl } from "./safe-fetch";

const NAV_TIMEOUT_MS = 15_000;
const USER_AGENT = "MetaTagSEOBot/0.1 (+headless; on-page SEO audit)";

export function isHeadlessAvailable() {
  return !!(
    process.env.BROWSER_WS_ENDPOINT ||
    process.env.CHROME_EXECUTABLE_PATH ||
    (process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID)
  );
}

// Connect a browser (remote CDP / Browserbase session / local launch), open the
// URL, run `fn(page)`, and tear the browser down. Returns fn's result, or null
// if rendering isn't available or anything fails. SSRF-guarded.
async function withBrowserPage(url, fn) {
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

  // Resolve a connect endpoint: explicit CDP URL, or a fresh Browserbase session.
  let connectUrl = process.env.BROWSER_WS_ENDPOINT || null;
  let browser = null;
  try {
    if (!connectUrl && process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID) {
      const { default: Browserbase } = await import("@browserbasehq/sdk");
      const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
      const session = await bb.sessions.create({ projectId: process.env.BROWSERBASE_PROJECT_ID });
      connectUrl = session.connectUrl;
    }

    browser = connectUrl
      ? await puppeteer.connect({ browserWSEndpoint: connectUrl })
      : await puppeteer.launch({
          executablePath: process.env.CHROME_EXECUTABLE_PATH,
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS });
    const result = await fn(page);
    await page.close();
    return result;
  } catch {
    return null;
  } finally {
    if (browser) {
      try {
        if (connectUrl) await browser.disconnect();
        else await browser.close();
      } catch {
        /* ignore teardown errors */
      }
    }
  }
}

// Render a URL in a real browser and return the fully-rendered HTML, or null.
export async function renderHtml(url) {
  return withBrowserPage(url, (page) => page.content());
}

// Run axe-core's color-contrast checks (WCAG AA + AAA) against the rendered page
// and return the raw axe result, or null if headless rendering is unavailable.
export async function runAxeContrast(url) {
  // axe-core ships its full browser source as a string; inject it as a <script>.
  const { source: axeSource } = (await import("axe-core")).default;
  return withBrowserPage(url, async (page) => {
    await page.addScriptTag({ content: axeSource });
    return page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: "rule", values: ["color-contrast", "color-contrast-enhanced"] },
        resultTypes: ["violations", "passes", "incomplete"],
      });
    });
  });
}
