"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isNavItemActive, NAV_ITEMS } from "./navigation";

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="flex-1 overflow-y-auto px-3 py-4"
    >
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          const link = (
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                "hover:bg-sidebar-hover hover:text-sidebar-active-foreground",
                "focus-visible:outline-sidebar-muted",
                active &&
                  "bg-sidebar-active font-medium text-sidebar-active-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-muted"
                />
              ) : null}
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className={cn(collapsed && "sr-only")}>{label}</span>
            </Link>
          );

          return (
            <li key={href}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
