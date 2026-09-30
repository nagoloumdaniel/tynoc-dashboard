"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function CategoriesError({ retry }: { retry: () => void }) {
  return (
    <ErrorState title="Impossible de charger les catégories." onRetry={retry} />
  );
}
