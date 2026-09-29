import { ConstructionIcon } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "./page-header";

// Temporary page body for sections not built yet; each is replaced in its roadmap phase.
export function SectionPlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: number;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={ConstructionIcon}
        title="Module en cours de construction"
        description={`Cette section sera disponible à la phase ${phase} de la roadmap.`}
      />
    </>
  );
}
