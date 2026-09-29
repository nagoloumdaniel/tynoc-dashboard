"use client";

import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title,
  description = "Vérifiez votre connexion puis réessayez. Si le problème persiste, il vient probablement de notre côté.",
  onRetry,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-danger/20 bg-surface px-6 py-16 text-center"
    >
      <AlertTriangleIcon className="mb-4 size-8 text-danger" aria-hidden />
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <RotateCwIcon aria-hidden />
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
