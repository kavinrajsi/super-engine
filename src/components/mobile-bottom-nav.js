"use client";

// Fixed bottom navigation bar — visible only on mobile (< 768px). Mirrors the
// 4 most-used destinations and exposes the full sidebar Sheet via "More".

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, FileText, PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, matches: ["/dashboard"] },
  { href: "/seo", label: "SEO", icon: BarChart3, matches: ["/seo", "/search-console"] },
  {
    href: "/articles",
    label: "Content",
    icon: FileText,
    matches: ["/articles", "/profiles", "/post-ideas", "/ideas", "/calendar"],
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t bg-background/95 backdrop-blur md:hidden"
      aria-label="Main navigation"
    >
      {ITEMS.map(({ href, label, icon: Icon, matches }) => {
        const active = matches.some((m) => pathname === m || pathname.startsWith(m + "/"));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <button
        onClick={toggleSidebar}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Open navigation menu"
      >
        <PanelLeft className="size-5 shrink-0" aria-hidden="true" />
        More
      </button>
    </nav>
  );
}
