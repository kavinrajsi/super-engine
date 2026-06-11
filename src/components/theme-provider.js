"use client";

// Thin wrapper around next-themes so the App Router layout (a Server Component)
// can drop a client-side theme context around the whole app.

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
