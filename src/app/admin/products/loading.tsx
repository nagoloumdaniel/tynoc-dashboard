import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Chargement des produits"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-full max-w-lg" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <div className="space-y-px overflow-hidden rounded-lg border bg-surface">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="size-10" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
