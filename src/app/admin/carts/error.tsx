"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function ListError({ retry }: { retry: () => void }) {
  return (
    <ErrorState title="Impossible de charger les paniers." onRetry={retry} />
  );
}
