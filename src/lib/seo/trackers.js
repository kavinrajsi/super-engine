// Analytics / tag-manager / heatmap tracker detection.
//
// Each tracker is identified by signature patterns found in a page's raw HTML
// (external script src or inline init snippet). `heatmap: true` marks tools that
// do session recording / heatmaps (Microsoft Clarity, Hotjar, FullStory, ...).

export const TRACKERS = [
  { key: "clarity", name: "Microsoft Clarity", heatmap: true, patterns: [/clarity\.ms\/tag/i, /\(c,\s*l,\s*a,\s*r,\s*i,\s*t,\s*y\)/i, /window\.clarity/i] },
  { key: "hotjar", name: "Hotjar", heatmap: true, patterns: [/static\.hotjar\.com/i, /_hjSettings|hjid:/i] },
  { key: "fullstory", name: "FullStory", heatmap: true, patterns: [/edge\.fullstory\.com|fullstory\.com\/s\/fs\.js/i] },
  { key: "luckyorange", name: "Lucky Orange", heatmap: true, patterns: [/luckyorange\.com/i] },
  { key: "mouseflow", name: "Mouseflow", heatmap: true, patterns: [/mouseflow\.com/i] },
  { key: "smartlook", name: "Smartlook", heatmap: true, patterns: [/smartlook\.com|rec\.smartlook/i] },
  { key: "ga4", name: "Google Analytics (GA4)", heatmap: false, patterns: [/googletagmanager\.com\/gtag\/js/i, /gtag\(\s*['"]config['"]/i] },
  { key: "gtm", name: "Google Tag Manager", heatmap: false, patterns: [/googletagmanager\.com\/gtm\.js/i, /GTM-[A-Z0-9]{4,}/] },
  { key: "ua", name: "Universal Analytics (legacy)", heatmap: false, patterns: [/google-analytics\.com\/(analytics|ga)\.js/i] },
  { key: "fbpixel", name: "Meta Pixel (Facebook)", heatmap: false, patterns: [/connect\.facebook\.net\/[^"']*fbevents\.js/i, /fbq\(/i, /facebook\.com\/tr\?/i] },
  { key: "fbsdk", name: "Facebook SDK", heatmap: false, patterns: [/connect\.facebook\.net\/[^"']*\/sdk\.js/i, /\bFB\.init\(/, /id=["']fb-root["']/i] },
  { key: "fb_domain_verify", name: "Facebook domain verification", heatmap: false, patterns: [/facebook-domain-verification/i] },
  { key: "plausible", name: "Plausible", heatmap: false, patterns: [/plausible\.io\/js/i] },
  { key: "fathom", name: "Fathom", heatmap: false, patterns: [/cdn\.usefathom\.com/i] },
  { key: "matomo", name: "Matomo", heatmap: false, patterns: [/matomo\.js|piwik\.js|_paq\.push/i] },
  { key: "segment", name: "Segment", heatmap: false, patterns: [/cdn\.segment\.com\/analytics\.js/i] },
  { key: "mixpanel", name: "Mixpanel", heatmap: false, patterns: [/cdn[^"']*mixpanel|mixpanel\.init/i] },
  { key: "amplitude", name: "Amplitude", heatmap: false, patterns: [/cdn\.amplitude\.com|amplitude\.getInstance/i] },
  { key: "posthog", name: "PostHog", heatmap: true, patterns: [/posthog\.com\/static|posthog\.init/i] },
  { key: "vercel", name: "Vercel Analytics", heatmap: false, patterns: [/\/_vercel\/insights/i] },
  { key: "linkedin", name: "LinkedIn Insight", heatmap: false, patterns: [/snap\.licdn\.com/i] },
];

// Return the list of trackers detected in the HTML.
export function detectTrackers(html) {
  const hay = html || "";
  const found = [];
  for (const t of TRACKERS) {
    if (t.patterns.some((re) => re.test(hay))) {
      found.push({ key: t.key, name: t.name, heatmap: t.heatmap });
    }
  }
  return found;
}

// Pull the Clarity project ID from the standard init snippet or tag URL.
export function clarityProjectId(html) {
  const hay = html || "";
  const fromArgs = hay.match(/["']clarity["']\s*,\s*["']script["']\s*,\s*["']([a-z0-9]+)["']/i);
  if (fromArgs) return fromArgs[1];
  const fromUrl = hay.match(/clarity\.ms\/tag\/([a-z0-9]+)/i);
  return fromUrl ? fromUrl[1] : null;
}
