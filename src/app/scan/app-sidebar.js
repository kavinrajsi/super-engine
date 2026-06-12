"use client";

// Dashboard sidebar: brand + section nav (Overview / Pages / Issues / AI / Tracking).

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LayoutDashboard, FileText, ListChecks, Bot, Activity, Gauge } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

const NAV = [
  { key: "ai", label: "AI Readiness", icon: Bot },
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "pages", label: "Pages", icon: FileText },
  { key: "issues", label: "Issues", icon: ListChecks },
  { key: "performance", label: "Performance", icon: Gauge },
  { key: "tracking", label: "Tracking", icon: Activity },
];

export default function AppSidebar({ active, onSelect, issueCount = 0 }) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 text-base font-bold">
          <span aria-hidden="true">🔎</span>
          <span>Meta Tag</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Audit</SidebarGroupLabel>
          <SidebarMenu>
            {NAV.map((n) => (
              <SidebarMenuItem key={n.key}>
                <SidebarMenuButton isActive={active === n.key} onClick={() => onSelect(n.key)}>
                  <n.icon />
                  <span>{n.label}</span>
                </SidebarMenuButton>
                {n.key === "issues" && issueCount > 0 && (
                  <SidebarMenuBadge>{issueCount}</SidebarMenuBadge>
                )}
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
