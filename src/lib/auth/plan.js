// Plans — the Pro tier has been removed. Every user gets full access for free.
// There is a single plan with all features enabled; planOf() ignores its
// argument and always returns it. Reintroducing tiers later is just this file.

const FULL = {
  deepScan: true,
  maxPages: 40, // matches the synchronous crawl cap (MAX_PAGES_SYNC)
  monitors: 10,
};

export function planOf() {
  return FULL;
}
