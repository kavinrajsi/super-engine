"use client";

// Light/dark toggle. Uses a mounted guard so the icon doesn't mismatch between
// server render and the resolved client theme (next-themes pattern).

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Until mounted, resolvedTheme is unknown — keep every theme-dependent
  // attribute neutral so the server and first client render match (no hydration
  // mismatch). After mount, show the real icon + title.
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle dark mode"
      title={!mounted ? "Toggle theme" : isDark ? "Switch to light" : "Switch to dark"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? isDark ? <Sun /> : <Moon /> : <span className="size-4" />}
    </Button>
  );
}
