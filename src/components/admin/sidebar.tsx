"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { SIDEBAR_COOKIE } from "./sidebar-cookie";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({ defaultCollapsed }: { defaultCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // Read by the server layout so the first paint matches the saved state.
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <Brand compact={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm hover:bg-sidebar-hover hover:text-sidebar-active-foreground focus-visible:outline-sidebar-muted",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-4" aria-hidden />
          ) : (
            <PanelLeftCloseIcon className="size-4" aria-hidden />
          )}
          <span className={cn(collapsed && "sr-only")}>
            {collapsed ? "Déplier le menu" : "Replier le menu"}
          </span>
        </button>
      </div>
    </aside>
  );
}
