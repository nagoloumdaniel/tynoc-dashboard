import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Chargement des catégories"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-px overflow-hidden rounded-lg border bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
