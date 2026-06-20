"use client";

// Shared on-demand audit state for the /seo dashboard. The SEO / Links /
// Technical / GEO tabs all read the SAME single scan result (one fetch per
// selected site) instead of each running their own. seo-dashboard.js owns the
// fetching and provides the value; tabs consume it via useScan().

import { createContext, useContext } from "react";

// { scan, status: 'idle'|'loading'|'done'|'error'|'unsupported', error, cached, rescan() }
export const ScanContext = createContext(null);

export function useScan() {
  return useContext(ScanContext);
}
