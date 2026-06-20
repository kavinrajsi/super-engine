"use client";

// Home header navigation. Inline links on md+; a hamburger-triggered Sheet on
// mobile so the links don't overflow a narrow header.

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const LINKS = [
  { href: "/compare", label: "Compare" },
  { href: "/monitors", label: "Monitors" },
  { href: "/history", label: "History" },
  { href: "/seo", label: "SEO" },
  { href: "/google-updates", label: "Algorithm updates" },
  { href: "/pricing", label: "Pricing" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: inline links */}
      <nav className="hidden items-center gap-4 md:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-medium text-muted-foreground no-underline hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Mobile: hamburger -> Sheet */}
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
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium no-underline hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
