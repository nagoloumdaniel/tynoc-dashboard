"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUrlFilters } from "./use-url-filters";

const DEBOUNCE_MS = 300;

export function SearchInput({
  param = "q",
  label,
  placeholder,
  className,
}: {
  param?: string;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const { params, setFilters } = useUrlFilters();
  const current = params.get(param) ?? "";
  const [value, setValue] = useState(current);

  // Follow external changes (reset button, back navigation).
  useEffect(() => setValue(current), [current]);

  useEffect(() => {
    if (value.trim() === current.trim()) return;
    const timer = setTimeout(
      () => setFilters({ [param]: value.trim() || undefined }),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // setFilters changes identity every render; the value is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, current, param]);

  return (
    <div className={cn("relative", className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 w-full rounded-md border bg-surface pr-9 pl-9 text-sm shadow-xs placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted"
        >
          <XIcon className="size-4" aria-hidden />
          <span className="sr-only">Effacer la recherche</span>
        </button>
      ) : null}
    </div>
  );
}
