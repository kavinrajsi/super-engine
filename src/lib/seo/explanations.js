// Plain-language explanations for every audit rule, written for non-technical
// readers. `what` = what the issue means in everyday terms; `why` = the
// real-world impact. The "how to fix" is each rule's existing `recommendation`.

export const EXPLANATIONS = {
  // --- Title ---
  "title.missing": {
    what: "This page has no title — the headline that shows in search results and browser tabs.",
    why: "Without it, search engines and people can't tell what the page is about, so it rarely gets clicked.",
  },
  "title.too_long": {
    what: "The page title is longer than search results can display.",
    why: "Google cuts it off, so visitors see a chopped-off headline that can lose the important words.",
  },
  "title.too_short": {
    what: "The page title is very short and doesn't say much.",
    why: "A vague headline gives people little reason to click your result over others.",
  },

  // --- Description ---
  "description.missing": {
    what: "There's no meta description — the short summary shown under your link in Google.",
    why: "Google will guess one from the page, which is usually less compelling and can hurt clicks.",
  },
  "description.too_long": {
    what: "The summary under your search result is longer than Google shows.",
    why: "It gets cut off, so the end of your message (often the call to action) is lost.",
  },
  "description.too_short": {
    what: "The search-result summary is very brief.",
    why: "A thin summary doesn't sell the page, so fewer people click through.",
  },

  // --- Canonical / structure ---
  "canonical.missing": {
    what: "The page doesn't tell search engines which version is the 'official' one.",
    why: "If the same content lives at several URLs, Google may split or pick the wrong one, weakening your ranking.",
  },
  "h1.missing": {
    what: "The page has no main heading (the big H1 at the top).",
    why: "The main heading tells readers and search engines the page's primary topic; without it the page looks unstructured.",
  },
  "h1.multiple": {
    what: "The page has more than one 'main' heading.",
    why: "Several top headings blur what the page is mainly about, which can dilute its focus.",
  },
  "viewport.missing": {
    what: "The page doesn't tell phones how to size the layout.",
    why: "On mobile it can look zoomed-out or broken, and Google ranks mobile-unfriendly pages lower.",
  },
  "lang.missing": {
    what: "The page doesn't declare which language it's written in.",
    why: "It helps search engines and screen readers serve the right audience and pronunciation.",
  },
  "robots.noindex": {
    what: "This page is explicitly told to stay out of Google.",
    why: "It will never appear in search results — make sure that's intentional.",
  },

  // --- Social (SMO) ---
  "og.incomplete": {
    what: "The page is missing the image, title, or description used when it's shared on social media.",
    why: "Links to it look plain or broken on Facebook/LinkedIn, so people are less likely to click.",
  },
  "twitter.card.missing": {
    what: "There's no setting for how the page looks when shared on X (Twitter).",
    why: "Shared links show a small, dull preview instead of a rich card, reducing clicks.",
  },
  "twitter.image.missing": {
    what: "There's no preview image for social shares.",
    why: "Links with no thumbnail get far fewer clicks than ones with an eye-catching image.",
  },

  // --- AEO (answer engines) ---
  "aeo.faq": {
    what: "Your page doesn't tell AI assistants which questions it answers.",
    why: "ChatGPT and Google's AI are less likely to quote your page as the answer.",
  },
  "aeo.questions": {
    what: "Your headings aren't phrased as the questions people actually ask.",
    why: "Answer engines match real questions to question-style headings, so you miss those answer spots.",
  },

  // --- GEO (generative engines / citability) ---
  "geo.author": {
    what: "The page doesn't say who wrote it.",
    why: "AI and Google trust content with a clear, credible author more, so anonymous pages get cited less.",
  },
  "geo.dates": {
    what: "There are no published or updated dates on the page.",
    why: "Engines favor fresh content; without a date your page can look stale and be skipped.",
  },
  "geo.depth": {
    what: "The page has very little text.",
    why: "Thin pages give AI engines little to quote or trust, so they rarely use them as a source.",
  },
  "geo.structure": {
    what: "The content has no lists or tables.",
    why: "AI engines pull facts more easily from lists and tables, so structured content gets cited more.",
  },

  // --- AIO (AI Overviews) ---
  "aio.schema": {
    what: "The page has no structured data — a machine-readable summary of what it is.",
    why: "Without it, Google's AI Overviews and rich results can't reliably understand the page.",
  },
  "aio.summary": {
    what: "There's no short summary of the page for engines to use.",
    why: "AI Overviews need a concise summary to feature your page; without one you're easy to skip.",
  },
  "aio.semantic": {
    what: "The main content isn't wrapped in a clear 'main' or 'article' section.",
    why: "It's harder for AI to tell your real content from menus and ads, so it may grab the wrong text.",
  },
  "aio.freshness": {
    what: "The page doesn't expose a last-updated date.",
    why: "Freshness signals help AI Overviews choose your page over older-looking ones.",
  },

  // --- AGO (agent / crawler access) ---
  "ago.render": {
    what: "The page's content only appears after JavaScript runs in a browser.",
    why: "Many AI crawlers don't run JavaScript, so they may see a blank page and skip your content.",
  },
  "ago.llms": {
    what: "The site has no llms.txt — a guide that points AI crawlers to your best content.",
    why: "Without it, AI tools may miss or misread what matters most on your site.",
  },
  "ago.llms_invalid": {
    what: "An llms.txt exists but doesn't follow the expected format.",
    why: "AI tools may ignore a malformed file, so its guidance is wasted.",
  },
  "ago.llms_full_invalid": {
    what: "The llms-full.txt (the expanded content version) is malformed or too short.",
    why: "AI tools can't use it as the full-content reference it's meant to be.",
  },
  "ago.bots": {
    what: "Your robots.txt blocks AI crawlers (like GPTBot or Google-Extended).",
    why: "Blocked crawlers can't read your site, so you won't show up in AI answers — confirm that's intended.",
  },

  // --- Deeper on-page checks ---
  "images.alt_missing": {
    what: "Some images have no alt text — the written description of what the image shows.",
    why: "Screen-reader users and search engines can't tell what those images are, hurting accessibility and image search.",
  },
  "headings.skipped": {
    what: "The page's headings jump levels (for example, an H2 is followed directly by an H4).",
    why: "An out-of-order outline confuses assistive tech and makes the page structure harder for search engines to follow.",
  },
  "hreflang.no_xdefault": {
    what: "The page lists language/region versions (hreflang) but has no x-default fallback.",
    why: "Visitors whose language isn't listed get no clear default version, which can send them to the wrong page.",
  },
  "content.mixed": {
    what: "A secure (https) page loads some files over insecure http.",
    why: "Browsers may block those files or warn visitors, breaking parts of the page and denting trust.",
  },
  "links.excessive": {
    what: "The page has an unusually large number of links.",
    why: "Too many links dilute the importance passed to each one and can read as spammy to search engines.",
  },
};

export function explain(ruleKey) {
  return EXPLANATIONS[ruleKey] || { what: "", why: "" };
}
