"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Updates = Record<string, string | undefined>;

/**
 * Filters live in the URL: shareable, kept on reload and in history.
 * Changing a filter goes back to page 1.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function build(updates: Updates, resetPage: boolean) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function setFilters(updates: Updates, { resetPage = true } = {}) {
    startTransition(() => {
      router.replace(build(updates, resetPage), { scroll: false });
    });
  }

  return {
    params,
    pending,
    setFilters,
    hrefWith: (updates: Updates) => build(updates, false),
    clear: () =>
      startTransition(() => router.replace(pathname, { scroll: false })),
  };
}
