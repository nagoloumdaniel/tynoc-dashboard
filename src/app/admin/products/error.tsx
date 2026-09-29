"use client";

import { ErrorState } from "@/components/feedback/error-state";

// retry() re-fetches the data, unlike reset() which only re-renders.
export default function ProductsError({ retry }: { retry: () => void }) {
  return (
    <ErrorState title="Impossible de charger les produits." onRetry={retry} />
  );
}
