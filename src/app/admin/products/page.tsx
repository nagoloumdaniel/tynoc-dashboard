import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Produits" };

export default function ProductsPage() {
  return (
    <SectionPlaceholder
      title="Produits"
      description="Catalogue, prix et niveaux de stock."
      phase={3}
    />
  );
}
