"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function UsersError({ retry }: { retry: () => void }) {
  return (
    <ErrorState
      title="Impossible de charger les utilisateurs."
      onRetry={retry}
    />
  );
}
