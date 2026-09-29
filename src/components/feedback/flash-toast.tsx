"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

// Messages shown after a server-side redirect (?flash=<key>).
const MESSAGES: Record<string, string> = {
  password: "Mot de passe modifié.",
};

export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get("flash");

  useEffect(() => {
    const message = key ? MESSAGES[key] : undefined;
    if (!message) return;
    toast.success(message);
    // Drop the parameter so a reload does not show the toast again.
    const next = new URLSearchParams(params.toString());
    next.delete("flash");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [key, params, pathname, router]);

  return null;
}
