"use client";

// Makes the request-resolved active site + profile list available to client
// components (the sidebar site switcher, the content tools). Resolution happens
// server-side in layout.js (see @/lib/site/active); this just carries it down.

import { createContext, useContext } from "react";

const ActiveSiteContext = createContext({ activeSite: null, profiles: [] });

export function ActiveSiteProvider({ value, children }) {
  return <ActiveSiteContext.Provider value={value}>{children}</ActiveSiteContext.Provider>;
}

export function useActiveSite() {
  return useContext(ActiveSiteContext);
}
