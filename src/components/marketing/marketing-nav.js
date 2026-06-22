"use client";

// Slim marketing top-nav for the landing page (standalone — no app sidebar).
// Inline links on md+, a hamburger Sheet on mobile.

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import ThemeToggle from "@/components/theme-toggle";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#ai-search", label: "AI search" },
  { href: "#pricing", label: "Pricing" },
];

export default function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight no-underline">
          <span aria-hidden="true">📈</span>
          <span>MadRank</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground no-underline hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm", className: "hidden text-foreground sm:inline-flex" })}
          >
            Sign in
          </Link>
          <a href="#audit" className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}>
            Run audit
          </a>

          {/* Mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />}
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="p-4 pb-0">Menu</SheetTitle>
              <nav className="flex flex-col gap-1 p-4 pt-2">
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2 text-sm font-medium no-underline hover:bg-muted"
                  >
                    {l.label}
                  </a>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm font-medium no-underline hover:bg-muted"
                >
                  Sign in
                </Link>
                <a
                  href="#audit"
                  onClick={() => setOpen(false)}
                  className={buttonVariants({ size: "sm", className: "mt-2" })}
                >
                  Run audit
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
