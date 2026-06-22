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
  LayoutDashboard,
  ScanSearch,
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
import SiteSwitcher from "@/components/site-switcher";
import { useActiveSite } from "@/components/active-site-provider";

// Grouped by job-to-be-done so navigation mirrors the user's workflow. Built per
// render so the Scan link can target the active site's URL.
function buildGroups(scanHref) {
  return [
    {
      label: "Start",
      links: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "SEO & Search",
      links: [
        { href: "/seo", label: "SEO", icon: BarChart3 },
        { href: scanHref, label: "Scan", icon: ScanSearch, match: "/scan" },
        { href: "/competitors", label: "Competitors", icon: Users },
        { href: "/compare", label: "Compare", icon: GitCompareArrows },
        { href: "/monitors", label: "Monitors", icon: Radar },
        { href: "/google-updates", label: "Algorithm updates", icon: CalendarClock },
      ],
    },
    {
      label: "Content",
      links: [
        { href: "/profiles", label: "Brand Memory", icon: BookText },
        { href: "/articles", label: "Articles", icon: FileText },
        { href: "/post-ideas", label: "Post Ideas", icon: Lightbulb },
      ],
    },
    {
      label: "History",
      links: [{ href: "/history", label: "History", icon: History }],
    },
    {
      label: "Settings",
      links: [{ href: "/ai-settings", label: "AI Settings", icon: Settings2 }],
    },
  ];
}

export default function AppNavSidebar() {
  const pathname = usePathname();
  const { activeSite } = useActiveSite();
  // Scan the active site when one is stored; otherwise send to the URL entry.
  const scanHref = activeSite?.website_url
    ? `/scan?url=${encodeURIComponent(activeSite.website_url)}`
    : "/";
  const groups = buildGroups(scanHref);

  return (
    <Sidebar>
      <SidebarHeader className="gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 text-base font-bold no-underline"
        >
          <span aria-hidden="true">📈</span>
          <span>MadRank</span>
        </Link>
        <SiteSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.links.map((l) => (
                <SidebarMenuItem key={l.label}>
                  <SidebarMenuButton
                    isActive={pathname === (l.match || l.href)}
                    render={<Link href={l.href} />}
                  >
                    <l.icon />
                    <span>{l.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
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
