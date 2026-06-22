"use client";

// Global app navigation sidebar (aside). The site-wide page links that used to
// live in the top header (SiteNav) now live here. Distinct from the scan
// dashboard's section-nav sidebar (scan/app-sidebar.js).

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Users,
  GitCompareArrows,
  Radar,
  History,
  BarChart3,
  CalendarClock,
  BookText,
  FileText,
  Lightbulb,
  Settings2,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

const LINKS = [
  { href: "/competitors", label: "Competitors", icon: Users },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/monitors", label: "Monitors", icon: Radar },
  { href: "/history", label: "History", icon: History },
  { href: "/seo", label: "SEO", icon: BarChart3 },
  { href: "/google-updates", label: "Algorithm updates", icon: CalendarClock },
  { href: "/profiles", label: "Brand Memory", icon: BookText },
  { href: "/articles", label: "Articles", icon: FileText },
  { href: "/post-ideas", label: "Post Ideas", icon: Lightbulb },
  { href: "/ai-settings", label: "AI Settings", icon: Settings2 },
];

export default function AppNavSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 text-base font-bold no-underline"
        >
          <span aria-hidden="true">📈</span>
          <span>MadRank</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarMenu>
            {LINKS.map((l) => (
              <SidebarMenuItem key={l.href}>
                <SidebarMenuButton
                  isActive={pathname === l.href}
                  render={<Link href={l.href} />}
                >
                  <l.icon />
                  <span>{l.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
