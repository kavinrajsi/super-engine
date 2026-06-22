"use client";

// Shared app layout shell: the global nav sidebar (aside) + a sticky header
// (sidebar trigger + user menu) + the page content in <main>. Pages keep their
// own inner container as children; this only provides the surrounding chrome.

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import UserMenu from "@/components/user-menu";
import AppNavSidebar from "@/components/app-nav-sidebar";

export default function AppShell({ children, title }) {
  return (
    <SidebarProvider>
      <AppNavSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          {title && (
            <div className="min-w-0 flex-1 truncate text-sm font-medium">{title}</div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
