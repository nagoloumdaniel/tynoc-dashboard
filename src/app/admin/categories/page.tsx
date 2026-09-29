import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Catégories" };

export default function CategoriesPage() {
  return (
    <SectionPlaceholder
      title="Catégories"
      description="Organisation du catalogue en catégories et sous-catégories."
      phase={4}
    />
  );
}
