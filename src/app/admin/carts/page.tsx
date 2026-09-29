import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Paniers" };

export default function CartsPage() {
  return (
    <SectionPlaceholder
      title="Paniers"
      description="Paniers en cours et paniers abandonnés."
      phase={6}
    />
  );
}
