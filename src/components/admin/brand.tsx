import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/admin"
      className={cn(
        "flex h-14 items-center gap-2.5 px-5 text-sidebar-active-foreground focus-visible:outline-sidebar-muted",
        compact && "justify-center px-0",
      )}
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
      >
        T
      </span>
      <span
        className={cn("font-semibold tracking-tight", compact && "sr-only")}
      >
        Tynoc Admin
      </span>
    </Link>
  );
}
