"use client";

import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { catchError, type ErrorInfo } from "next/error";
import { Button } from "@/components/ui/button";

/** One failing widget must not take the whole dashboard down. */
function WidgetError({ title }: { title: string }, { retry }: ErrorInfo) {
  return (
    <section
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-danger/20 bg-surface p-5"
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangleIcon className="size-4 text-danger" aria-hidden />
        {title} : chargement impossible.
      </p>
      <Button variant="outline" size="sm" onClick={() => retry()}>
        <RotateCwIcon aria-hidden />
        Réessayer
      </Button>
    </section>
  );
}

export const WidgetBoundary = catchError(WidgetError);
