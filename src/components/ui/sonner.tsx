"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      // At the bottom, full-width mobile toasts covered list and card actions.
      position="top-center"
      richColors
      closeButton
      toastOptions={{ className: "font-sans" }}
    />
  );
}
